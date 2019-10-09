const ejs = require('ejs');
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
    loadModule,
    info
} = require('@yuandana/react-cli-shared-utils');
const normalizeFilePaths = require('./util/normalize-file-paths');
const writeFileTree = require('./util/write-file-tree');
const sortObject = require('./util/sort-object');
const { resolvePreset } = require('./preset');
const ProjectGeneratorAPI = require('./project-generator-api');
const { loadLocalConfig } = require('./local-config');
const { installDeps } = require('./util/install-deps');
const CLIVersion = require(`../package.json`).version;

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
        // 项目名称
        this.name = name;
        // 执行命令的上下文地址
        this.context = context;
        // 虚拟文件树
        this.files = {};
        // package 的配置对象
        this.pkg = {};
        // 通过 ProjectGeneratorApi 注入进来的文件生成器
        this.fileMiddlewares = [];
    }

    async create(cliOptions = {}, preset = null) {
        await clearConsole();
        info(`@yuandana/react-cli v${CLIVersion}`);

        // 第一步
        // 根据 cliOptions 的参数获取 preset
        if (!preset) {
            preset = await resolvePreset(this.name, cliOptions);
        }
        // 第二步
        // 根据 preset 组织 package.json
        // 写入文件夹
        await clearConsole();
        info(`@yuandana/react-cli v${CLIVersion}`);
        // 根据用户选项结果组织 pkg 对象
        this.pkg = await this.resolvePkg(this.name, preset);
        logWithSpinner(
            `✨`,
            `Creating project in ${chalk.yellow(this.context)}.`
        );
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
        stopSpinner();

        // 第三步
        // 在创建的文件夹中执行 npm install || yarn 来安装所有依赖
        const packageManager =
            cliOptions.packageManager ||
            loadLocalConfig().packageManager ||
            (hasYarn() ? 'yarn' : 'npm');
        info(`Installing CLI plugins. This might take a while...`);
        await installDeps(this.context, packageManager, cliOptions.registry);

        // 第四步
        // 获取所有安装的 plugins
        // 并执行其内的 generator 来初始化项目
        logWithSpinner(`✨`, `Invoking generators...`);
        const plugins = await this.resolvePlugins(preset.plugins);
        // 执行所有 plugin 中的 generator
        // 通过 generator 收取所有 fileMiddleware 到 this.fileMiddlewares
        // 并通过 resolveFiles 执行
        plugins.forEach(({ id, apply, options }) => {
            const api = new ProjectGeneratorAPI(id, this, options);
            apply(api, options);
        });
        // 并通过 resolveFiles 执行 this.fileMiddlewares
        // 并将文件注入到虚拟文件树 this.files 上
        await this.resolveFiles(preset);
        stopSpinner();

        // 第五步
        // 如果创建时 用户选择了 preset.userConfigFiles
        logWithSpinner(`✨`, `Extract config to files`);
        if (preset.useConfigFiles) {
            this.extractConfigFiles();
        }
        stopSpinner();

        // 最后
        // 生成所有文件
        // 结束
        await writeFileTree(this.context, this.files);
        process.exit(1);
    }

    extractConfigFiles() {
        // todo something to this.files
    }

    getVersions() {
        const {
            latestVersion = CLIVersion,
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
            current: CLIVersion,
            latest: latestVersion
        };
    }

    /**
     * 读取对应id下的 generator 内容
     * 组装所有plugins对象
     * 如有 prompts 配置 则有options对象
     * {
     *  id, apply, options
     * }
     * @param {d} plugins
     */
    async resolvePlugins(plugins = []) {
        // ensure cli-service is invoked first
        // 确保 react-cli-service 被排在第一位， react-cli-service/generator 第一执行
        plugins = sortObject(plugins, ['@yuandana/react-cli-service'], true);
        const result = [];
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
            result.push({ id, apply, options });
        }
        return result;
    }

    async resolveFiles(preset = {}) {
        const files = this.files;
        for (const middleware of this.fileMiddlewares) {
            await middleware(files, ejs.render);
        }
        files['package.json'] = JSON.stringify(this.pkg, null, 2) + '\n';

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
            devDependencies: {},
            dependencies: {}
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
