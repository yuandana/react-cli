const path = require('path');
const hash = require('hash-sum');
// const { matchesPluginId } = require('@yuandana/react-cli-shared-utils');

/**
 * PluginAPI 类
 *
 * 在项目初始化时，暴露给插件的 api
 * 插件在执行时拿到的是独立 PluginAPI 实例
 */
class PluginAPI {
    /**
     * @param {string} id - 插件的 Id，react-plugin-[id]
     * @param {Service} service - react-cli-service 实例.
     */
    constructor(id, service) {
        this.id = id;
        this.service = service;
    }

    /**
     * 当前的工作目录.
     */
    getCwd() {
        return this.service.context;
    }

    /**
     * 通过相对于项目根目录的相对路径获取到绝对路径
     *
     * @param  {string} _path - 相对于项目根目录的相对路径
     * @return {string} 获取到的绝对路径.
     */
    resolve(_path) {
        return path.resolve(this.service.context, _path);
    }

    /**
     * Register a command that will become available as `react-cli-service [name]`.
     * 注册一个命令 可通过 `react-cli-service [命令]` 来执行
     *
     * @param {string} name
     * @param {object} [opts]
     *   {
     *      description: string,
     *      usage: string,
     *      options: { [string]: string }
     *   }
     * @param {function} fn
     *   (args: { [string]: string }, rawArgs: string[]) => ?Promise
     */
    registerCommand(name, opts, fn) {
        if (typeof opts === 'function') {
            fn = opts;
            opts = null;
        }
        this.service.commands[name] = { fn, opts: opts || {} };
    }

    /**
     * Register a function that will receive a chainable webpack config
     * the function is lazy and won't be called until `resolveWebpackConfig` is
     * called
     *
     * @param {function} fn
     */
    chainWebpack(fn) {
        this.service.webpackChainFns.push(fn);
    }

    /**
     * Register
     * - a webpack configuration object that will be merged into the config
     * OR
     * - a function that will receive the raw webpack config.
     *   the function can either mutate the config directly or return an object
     *   that will be merged into the config.
     *
     * @param {object | function} fn
     */
    configureWebpack(fn) {
        this.service.webpackConfigFns.push(fn);
    }

    /**
     * Register a dev serve config function. It will receive the express `app`
     * instance of the dev server.
     *
     * @param {function} fn
     */
    configureDevServer(fn) {
        this.service.devServerConfigFns.push(fn);
    }

    /**
     * Resolve the final raw webpack config, that will be passed to webpack.
     *
     * @param {ChainableWebpackConfig} [chainableConfig]
     * @return {object} raw webpack config.
     */
    resolveWebpackConfig(chainableConfig) {
        return this.service.resolveWebpackConfig();
    }

    /**
     * Resolve an intermediate chainable webpack config instance, which can be
     * further tweaked before generating the final raw webpack config.
     * You can call this multiple times to generate different branches of the
     * base webpack config.
     * See https://github.com/mozilla-neutrino/webpack-chain
     *
     * @return {ChainableWebpackConfig}
     */
    resolveChainableWebpackConfig() {
        return this.service.resolveChainableWebpackConfig();
    }

    /**
     * Generate a cache identifier from a number of variables
     */
    genCacheConfig(id, partialIdentifier, configFiles) {
        const fs = require('fs');
        const cacheDirectory = this.resolve(`node_modules/.cache/${id}`);

        // replace \r\n to \n generate consistent hash
        const fmtFunc = conf => {
            if (typeof conf === 'function') {
                return conf.toString().replace(/\r\n?/g, '\n');
            }
            return conf;
        };

        const variables = {
            partialIdentifier,
            'cli-service': require('../package.json').version,
            'cache-loader': require('cache-loader/package.json').version,
            env: process.env.NODE_ENV,
            test: !!process.env.VUE_CLI_TEST,
            config: [
                fmtFunc(this.service.projectOptions.chainWebpack),
                fmtFunc(this.service.projectOptions.configureWebpack)
            ]
        };

        if (configFiles) {
            const readConfig = file => {
                const absolutePath = this.resolve(file);
                if (fs.existsSync(absolutePath)) {
                    if (absolutePath.endsWith('.js')) {
                        // should evaluate config scripts to reflect environment variable changes
                        try {
                            return JSON.stringify(require(absolutePath));
                        } catch (e) {
                            return fs.readFileSync(absolutePath, 'utf-8');
                        }
                    }
                }
            };
            if (!Array.isArray(configFiles)) {
                configFiles = [configFiles];
            }
            for (const file of configFiles) {
                const content = readConfig(file);
                if (content) {
                    variables.configFiles = content.replace(/\r\n?/g, '\n');
                    break;
                }
            }
        }

        const cacheIdentifier = hash(variables);
        return { cacheDirectory, cacheIdentifier };
    }
}

module.exports = PluginAPI;
