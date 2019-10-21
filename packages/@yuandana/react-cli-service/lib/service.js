const fs = require('fs-extra');
const path = require('path');
const readPkg = require('read-pkg');
const merge = require('webpack-merge');
const WebpackChainConfig = require('webpack-chain');
const { warn, error, isPlugin } = require('@yuandana/react-cli-shared-utils');
const PluginAPI = require('./plugin-api');
const { builtinPlugins, idToPlugin } = require('./buildin-plugins');
const defaultsDeep = require('lodash.defaultsdeep');

function cloneRuleNames(to, from) {
    if (!to || !from) {
        return;
    }
    from.forEach((r, i) => {
        if (to[i]) {
            Object.defineProperty(to[i], '__ruleNames', {
                value: r.__ruleNames
            });
            cloneRuleNames(to[i].oneOf, r.oneOf);
        }
    });
}

class Service {
    constructor(context) {
        this.webpackConfigFns = [];
        this.webpackChainFns = [];
        this.devServerConfigFns = [];

        this.commands = {};
        this.context = context;
        this.pkg = this.resolvePkg();
        this.plugins = this.resolvePlugins();

        this.initialized = false;
    }

    async run(name, args = {}, rawArgv = []) {
        this.init();

        args._ = args._ || [];
        let command = this.commands[name];
        if (!command && name) {
            error(`command "${name}" does not exist.`);
            process.exit(1);
        }
        if (!command || args.help || args.h) {
            command = this.commands.help;
        } else {
            args._.shift(); // remove command itself
            rawArgv.shift();
        }
        const { fn } = command;
        return fn(args, rawArgv);
    }

    async init(mode = process.env.REACT_CLI_MODE) {
        if (this.initialized) {
            return;
        }
        this.initialized = true;
        // apply plugins.

        const options = this.loadUserOptions();
        this.projectOptions = defaultsDeep(userOptions);

        this.plugins.forEach(({ id, apply }) => {
            // 文件存在但返回错误时
            // apply 可能不是 function
            // 执行将报错影响其他函数执行
            typeof apply === 'function' &&
                apply(new PluginAPI(id, this), this.projectOptions);
        });

        // apply webpack configs from project config file
        if (this.projectOptions.chainWebpack) {
            this.webpackChainFns.push(this.projectOptions.chainWebpack);
        }
        if (this.projectOptions.configureWebpack) {
            this.webpackRawConfigFns.push(this.projectOptions.configureWebpack);
        }
    }

    loadUserOptions() {
        // react.config.js
        let fileConfig, pkgConfig, resolved, resolvedFrom;
        const configPath =
            process.env.REACT_CLI_SERVICE_CONFIG_PATH ||
            path.resolve(this.context, 'react.config.js');
        if (fs.existsSync(configPath)) {
            try {
                fileConfig = require(configPath);
                if (!fileConfig || typeof fileConfig !== 'object') {
                    error(
                        `Error loading ${chalk.bold(
                            'react.config.js'
                        )}: should export an object.`
                    );
                    fileConfig = null;
                }
            } catch (e) {
                error(`Error loading ${chalk.bold('react.config.js')}:`);
                throw e;
            }
        }

        // package.react
        pkgConfig = this.pkg.react;
        if (pkgConfig && typeof pkgConfig !== 'object') {
            error(
                `Error loading react-cli config in ${chalk.bold(
                    `package.json`
                )}: ` + `the "react" field should be an object.`
            );
            pkgConfig = null;
        }

        if (fileConfig) {
            if (pkgConfig) {
                warn(
                    `"react" field in package.json ignored ` +
                        `due to presence of ${chalk.bold('react.config.js')}.`
                );
                warn(
                    `You should migrate it into ${chalk.bold(
                        'react.config.js'
                    )} ` + `and remove it from package.json.`
                );
            }
            resolved = fileConfig;
            resolvedFrom = 'react.config.js';
        } else if (pkgConfig) {
            resolved = pkgConfig;
            resolvedFrom = '"react" field in package.json';
        } else {
            resolved = this.inlineOptions || {};
            resolvedFrom = 'inline options';
        }

        if (typeof resolved.baseUrl !== 'undefined') {
            if (typeof resolved.publicPath !== 'undefined') {
                warn(
                    `You have set both "baseUrl" and "publicPath" in ${chalk.bold(
                        'react.config.js'
                    )}, ` +
                        `in this case, "baseUrl" will be ignored in favor of "publicPath".`
                );
            } else {
                warn(
                    `"baseUrl" option in ${chalk.bold('react.config.js')} ` +
                        `is deprecated now, please use "publicPath" instead.`
                );
                resolved.publicPath = resolved.baseUrl;
            }
        }

        // normalize some options
        ensureSlash(resolved, 'publicPath');
        if (typeof resolved.publicPath === 'string') {
            resolved.publicPath = resolved.publicPath.replace(/^\.\//, '');
        }
        // for compatibility concern, in case some plugins still rely on `baseUrl` option
        resolved.baseUrl = resolved.publicPath;
        removeSlash(resolved, 'outputDir');

        // deprecation warning
        // TODO remove in final release
        if (resolved.css && resolved.css.localIdentName) {
            warn(
                `css.localIdentName has been deprecated. ` +
                    `All css-loader options (except "modules") are now supported via css.loaderOptions.css.`
            );
        }

        // validate options
        // validate(resolved, msg => {
        //     error(`Invalid options in ${chalk.bold(resolvedFrom)}: ${msg}`);
        // });

        return resolved;
    }

    resolvePkg() {
        const context = this.context;
        if (fs.existsSync(path.join(context, 'package.json'))) {
            return readPkg.sync({ cwd: context });
        } else {
            return {};
        }
    }

    resolvePlugins() {
        const projectPlugins = Object.keys(this.pkg.devDependencies || {})
            .concat(Object.keys(this.pkg.dependencies || {}))
            .filter(isPlugin)
            .map(id => {
                if (
                    this.pkg.optionalDependencies &&
                    id in this.pkg.optionalDependencies
                ) {
                    let apply = () => {};
                    try {
                        apply = require(id);
                    } catch (e) {
                        warn(`Optional dependency ${id} is not installed.`);
                    }
                    return { id, apply };
                } else {
                    return idToPlugin(id);
                }
            });
        return builtinPlugins.concat(projectPlugins);
    }

    resolveChainableWebpackConfig() {
        const chainableConfig = new WebpackChainConfig();
        // apply chains
        this.webpackChainFns.forEach(fn => fn(chainableConfig));
        return chainableConfig;
    }

    resolveWebpackConfig(
        chainableConfig = this.resolveChainableWebpackConfig()
    ) {
        if (!this.initialized) {
            throw new Error(
                'Service must call init() before calling resolveWebpackConfig().'
            );
        }
        // get raw config
        let config = chainableConfig.toConfig();
        const original = config;
        // apply raw config fns
        this.webpackConfigFns.forEach(fn => {
            if (typeof fn === 'function') {
                // function with optional return value
                const res = fn(config);
                if (res) config = merge(config, res);
            } else if (fn) {
                // merge literal values
                config = merge(config, fn);
            }
        });

        // #2206 If config is merged by merge-webpack, it discards the __ruleNames
        // information injected by webpack-chain. Restore the info so that
        // vue inspect works properly.
        if (config !== original) {
            cloneRuleNames(
                config.module && config.module.rules,
                original.module && original.module.rules
            );
        }

        // check if the user has manually mutated output.publicPath
        const target = process.env.REACT_CLI_BUILD_TARGET;
        if (
            !process.env.REACT_CLI_TEST &&
            (target && target !== 'app') &&
            config.output.publicPath !== this.projectOptions.publicPath
        ) {
            throw new Error(
                `Do not modify webpack output.publicPath directly. ` +
                    `Use the "publicPath" option in react.config.js instead.`
            );
        }

        return config;
    }
}

module.exports = Service;
