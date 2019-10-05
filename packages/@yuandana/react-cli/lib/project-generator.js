const chalk = require('chalk');
const semver = require('semver');
const fs = require('fs-extra');
const debug = require('debug');
const {
    clearConsole,
    logWithSpinner,
    log,
    stopSpinner,
    hasYarn,
    loadModule
} = require('@yuandana/react-cli-shared-utils');
const normalizeFilePaths = require('./util/normalize-file-paths');
const writeFileTree = require('./util/write-file-tree');
const sortObject = require('./util/sort-object');
const { resolvePreset } = require('./preset');
const PluginGeneratorAPI = require('./plugin-generator-api');
const { loadLocalConfig } = require('./local-config');
const { installDeps } = require('./util/install-deps');

/**
 * 确保在文件的最后一行空行
 * 为啥？不知道
 * @param {*} str
 */
const ensureEOL = str => {
    if (str.charAt(str.length - 1) !== '\n') {
        return str + '\n';
    }
    return str;
};

class ProjectGenerator {
    /**
     * 构造函数
     * @param {String} name 项目名称
     * @param {String} context 项目目录路径
     */
    constructor(name, context) {
        this.name = name;
        this.context = context;
        this.files = {};
        // plugin 会通过 PluginGeneratorApi 类操作 this.pkg
        this.pkg = {};
    }

    async create(cliOptions = {}, preset = null) {
        const localVersion = require(`../package.json`).version;
        const consoleTitle = `React cli ${localVersion}`;
        // 获取用户根据介绍的选项配置
        await clearConsole();
        log(`${chalk.blue(consoleTitle)}`);

        // 根据介绍信息选项获取用户配置对象
        if (!preset) {
            preset = await resolvePreset(cliOptions);
        }

        // 开始创建项目
        await clearConsole();

        // 根据用户选项结果组织 pkg 对象
        this.pkg = await this.resolvePkg(this.name, preset);

        //根据 pkg 对象 及 preset 组织文件对象
        const files = this.resolveFiles(this.pkg, preset);

        logWithSpinner(
            `✨`,
            `Creating project in ${chalk.yellow(this.context)}.`
        );

        const packageManager =
            cliOptions.packageManager ||
            loadLocalConfig().packageManager ||
            (hasYarn() ? 'yarn' : 'npm');

        try {
            // 创建文件夹（同步）
            fs.mkdirsSync(this.context);
            // 生成 package.json 文件用于安装依赖 plugins
            await writeFileTree(this.context, {
                ['package.json']: JSON.stringify(this.pkg, null, 2) + '\n'
            });
        } catch (error) {
            stopSpinner();
            log(error);
        }

        // install
        stopSpinner();
        log(`Installing CLI plugins. This might take a while...`);
        log();
        await installDeps(this.context, packageManager, cliOptions.registry);

        // 调用 plugins 里的 generator 逻辑生成配置文件
        log();
        log(`Invoking generators...`);
        const plugins = await this.resolvePlugins(preset.plugins);

        // apply generators from plugins
        plugins.forEach(({ id, apply, options }) => {
            const api = new PluginGeneratorAPI(id, this, options);
            apply(api, options);
        });
        if (preset.useConfigFiles) {
            this.extractConfigFiles();
        }
        await writeFileTree(this.context, {
            ['package.json']: JSON.stringify(this.pkg, null, 2) + '\n'
        });
    }

    extractConfigFiles() {
        // todo something to this.files
    }

    getVersions() {
        const localVersion = require(`../package.json`).version;
        const {
            latestVersion = localVersion,
            lastChecked = 0
        } = loadLocalConfig();
        const daysPassed = (Date.now() - lastChecked) / (60 * 60 * 1000 * 24);

        if (daysPassed > 1) {
            // if we haven't check for a new version in a day, wait for the check
            // before proceeding
        } else {
            // Otherwise, do a check in the background. If the result was updated,
            // it will be used for the next 24 hours.
        }

        return {
            current: localVersion,
            latest: latestVersion
        };
    }

    async resolvePlugins(plugins = []) {
        const resultPlugins = [];
        for (const id of Object.keys(plugins)) {
            const apply =
                loadModule(`${id}/generator`, this.context) || (() => {});
            let options = plugins[id] || {};
            if (options.prompts) {
                const prompts = loadModule(`${id}/prompts`, this.context);
                if (prompts) {
                    log();
                    log(
                        `${chalk.cyan(
                            options._isPreset ? `Preset options:` : id
                        )}`
                    );
                    options = await inquirer.prompt(prompts);
                }
            }
            resultPlugins.push({ id, apply, options });
        }
        return resultPlugins;
    }

    resolveFiles(pkg, preset = {}) {
        const files = {};
        files['package.json'] = JSON.stringify(pkg, null, 2) + '\n';

        // normalize file paths on windows
        // all paths are converted to use / instead of \
        normalizeFilePaths(files);
        return files;
    }

    async resolvePkg(name, preset = {}) {
        const pkg = {
            name,
            version: '0.1.0',
            private: true,
            description: '',
            author: '',
            devDependencies: {
                '@yuandana/react-cli-service': 'latest'
            },
            dependencies: {
                react: 'latest',
                'react-dom': 'latest'
            }
        };

        const { latest } = await this.getVersions();
        const latestMinor = `${semver.major(latest)}.${semver.minor(latest)}.0`;

        const deps = Object.keys(preset.plugins);
        deps.forEach(dep => {
            pkg.devDependencies[dep] =
                preset.plugins[dep].version ||
                (/^@yuandana/.test(dep) ? `^${latestMinor}` : `latest`);
        });

        return this.sortPkg(pkg);
    }

    sortPkg(pkg) {
        // ensure package.json keys has readable order
        pkg.dependencies = sortObject(pkg.dependencies);
        pkg.devDependencies = sortObject(pkg.devDependencies);
        pkg.scripts = sortObject(pkg.scripts, [
            'serve',
            'build'
            // 'test',
            // 'e2e',
            // 'lint',
            // 'deploy'
        ]);
        pkg = sortObject(pkg, [
            'name',
            'version',
            'private',
            'description',
            'author',
            'scripts',
            'dependencies',
            'devDependencies',
            // 'vue',
            'babel'
            // 'eslintConfig',
            // 'prettier',
            // 'postcss',
            // 'browserslist',
            // 'jest'
        ]);

        debug('react:cli-pkg')(pkg);
        return pkg;
    }
}

module.exports = ProjectGenerator;
