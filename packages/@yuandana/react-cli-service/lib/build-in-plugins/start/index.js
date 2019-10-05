const { info, openBrowser } = require('@yuandana/react-cli-shared-utils');

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
                '--host': `specify host (default: ${defaultOptions.host})`,
                '--port': `specify port (default: ${defaultOptions.port})`,
                '--https': `use https (default: ${defaultOptions.https})`,
                '--public': `specify the public network URL for the HMR client`
            }
        },
        async args => {
            info('Starting development server...');
            const webpackConfig = require('../webpack-config-factory');
            console.log('TCL: webpackConfig', webpackConfig);
            console.info(webpackConfig.toConfig());
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
