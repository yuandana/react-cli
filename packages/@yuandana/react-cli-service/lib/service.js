const fs = require('fs-extra');
const path = require('path');
const readPkg = require('read-pkg');
const merge = require('webpack-merge');
const WebpackChainConfig = require('webpack-chain');
const { warn, error, isPlugin } = require('@yuandana/react-cli-shared-utils');
const PluginAPI = require('./plugin-api');
const { builtinPlugins, idToPlugin } = require('./buildin-plugins');

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

        this.plugins.forEach(({ id, apply }) => {
            // 文件存在但返回错误时
            // apply 可能不是 function
            // 执行将报错影响其他函数执行
            typeof apply === 'function' &&
                apply(new PluginAPI(id, this), this.projectOptions);
        });
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
