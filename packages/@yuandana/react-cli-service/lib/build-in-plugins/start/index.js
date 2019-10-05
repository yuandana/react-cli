const {
    info,
    openBrowser,
    checkBrowsers
} = require('@yuandana/react-cli-shared-utils');
const {
    choosePort,
    createCompiler,
    prepareProxy,
    prepareUrls
} = require('../../react-dev-utils/webpack-dev-server-utils');
const paths = require('../../paths');
const createDevServerConfig = require('../webpack-dev-server.config');
const fs = require('fs');
const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const clearConsole = require('../../react-dev-utils/clear-console');
const chalk = require('chalk');
const DEFAULT_OPTIONS = {
    HOST: process.env.HOST || '0.0.0.0',
    PORT: parseInt(process.env.PORT, 10) || 3000,
    HTTPS: false
};

module.exports = (api, projectOptions) => {
    api.registerCommand(
        'start',
        {
            description: 'start development server',
            usage: 'react-cli-service start [options] [entry]',
            options: {
                '--open': `open browser on server start`,
                '--copy': `copy url to clipboard on server start`,
                '--mode': `specify env mode (default: development)`,
                '--host': `specify host (default: ${DEFAULT_OPTIONS.host})`,
                '--port': `specify port (default: ${DEFAULT_OPTIONS.port})`,
                '--https': `use https (default: ${DEFAULT_OPTIONS.https})`,
                '--public': `specify the public network URL for the HMR client`
            }
        },
        async args => {
            info('Starting development server...');

            checkBrowsers(paths.appPath)
                .then(() => {
                    // We attempt to use the default port but if it is busy, we offer the user to
                    // run on a different port. `choosePort()` Promise resolves to the next free port.
                    return choosePort(
                        DEFAULT_OPTIONS.host,
                        DEFAULT_OPTIONS.port
                    );
                })
                .then(() => {
                    const config = api.resolveWebpackConfig();
                    console.log('TCL: config', JSON.stringify(config));

                    const protocol =
                        process.env.HTTPS === 'true' ? 'https' : 'http';
                    const appName = require(paths.appPackageJson).name;
                    const useTypeScript = fs.existsSync(paths.appTsConfig);
                    const useYarn = fs.existsSync(paths.yarnLockFile);
                    const isInteractive = process.stdout.isTTY;
                    const tscCompileOnError =
                        process.env.TSC_COMPILE_ON_ERROR === 'true';
                    const urls = prepareUrls(
                        protocol,
                        DEFAULT_OPTIONS.host,
                        DEFAULT_OPTIONS.port
                    );
                    const devSocket = {
                        warnings: warnings =>
                            devServer.sockWrite(
                                devServer.sockets,
                                'warnings',
                                warnings
                            ),
                        errors: errors =>
                            devServer.sockWrite(
                                devServer.sockets,
                                'errors',
                                errors
                            )
                    };

                    const compiler = createCompiler({
                        appName,
                        config,
                        devSocket,
                        urls,
                        useYarn,
                        useTypeScript,
                        tscCompileOnError,
                        webpack
                    });

                    const proxySetting = require(paths.appPackageJson).proxy;
                    const proxyConfig = prepareProxy(
                        proxySetting,
                        paths.appPublic
                    );
                    // Serve webpack assets generated by the compiler over a web server.
                    const serverConfig = createDevServerConfig(
                        proxyConfig,
                        urls.lanUrlForConfig
                    );

                    const devServer = new WebpackDevServer(
                        compiler,
                        serverConfig
                    );

                    // Launch WebpackDevServer.
                    devServer.listen(
                        DEFAULT_OPTIONS.port,
                        DEFAULT_OPTIONS.host,
                        err => {
                            if (err) {
                                return console.log(err);
                            }
                            if (isInteractive) {
                                clearConsole();
                            }

                            // We used to support resolving modules according to `NODE_PATH`.
                            // This now has been deprecated in favor of jsconfig/tsconfig.json
                            // This lets you use absolute paths in imports inside large monorepos:
                            if (process.env.NODE_PATH) {
                                console.log(
                                    chalk.yellow(
                                        'Setting NODE_PATH to resolve modules absolutely has been deprecated in favor of setting baseUrl in jsconfig.json (or tsconfig.json if you are using TypeScript) and will be removed in a future major release of create-react-app.'
                                    )
                                );
                                console.log();
                            }

                            console.log(
                                chalk.cyan(
                                    'Starting the development server...\n'
                                )
                            );
                            openBrowser(urls.localUrlForBrowser);
                        }
                    );
                });
        }
    );

    api.chainWebpack(webpackConfig => {
        // 通过 webpack-chain 修改 webpack 配置
    });

    api.configureWebpack(webpackConfig => {
        // 修改 webpack 配置
        // 或返回通过 webpack-merge 合并的配置对象
    });
};
