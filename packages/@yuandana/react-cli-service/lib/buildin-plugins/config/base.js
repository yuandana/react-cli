const paths = require('../../paths');
const publicPath = '/';
const useTypeScript = false;
const imageInlineSizeLimit = parseInt(
    process.env.IMAGE_INLINE_SIZE_LIMIT || '10000'
);

module.exports = api => {
    api.chainWebpack(webpackChainConfig => {
        // mode === 'production'
        // mode === 'development'
        // mode === 'test'

        webpackChainConfig.mode('development');

        // webpackConfig.entry
        webpackChainConfig
            .entry('app')
            .add(paths.appIndexJs)
            .end();

        // webpackConfig.output
        webpackChainConfig.output
            .path(paths.appDist)
            .filename('static/js/bundle.js')
            .publicPath(publicPath)
            .end();

        // webpackConfig.resolve.extensions
        webpackChainConfig.resolve.extensions
            .merge(
                paths.moduleFileExtensions
                    .map(ext => `.${ext}`)
                    .filter(ext => useTypeScript || !ext.includes('ts'))
            )
            .end();

        // webpackConfig.resolve.modules
        webpackChainConfig.resolve.modules
            .add('node_modules')
            .add(paths.appNodeModules)
            .end();

        // webpackConfig.module
        // config.module
        //     .rule('compile')
        //     .oneOf('media')
        //     .test([/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/])
        //     .loader(require.resolve('url-loader'))
        //     .options({
        //         limit: imageInlineSizeLimit,
        //         name: 'static/media/[name].[hash:8].[ext]'
        //     })
        //     .end();
        webpackChainConfig
            .plugin('html-webpack-plugin')
            .use(require.resolve('html-webpack-plugin'), [
                {
                    inject: true,
                    template: paths.appHtml
                }
            ])
            .end();

        webpackChainConfig.merge({
            module: {
                strictExportPresence: true
            }
        });
    });
};
