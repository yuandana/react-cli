const Config = require('webpack-chain');
const paths = require('./paths');
const publicPath = isEnvProduction ? paths.servedPath : isEnvDevelopment && '/';
const imageInlineSizeLimit = parseInt(
    process.env.IMAGE_INLINE_SIZE_LIMIT || '10000'
);

const webpackConfigFactory = mode => {
    // mode === 'production'
    // mode === 'developer'
    // mode === 'test'

    const config = new Config();

    // webpackConfig.entry
    config
        .entry()
        .add(paths.appIndexJs)
        .end();

    // webpackConfig.output
    config.output
        .path(paths.appBuild)
        .filename('static/js/bundle.js')
        .publicPath(publicPath)
        .end();

    // webpackConfig.resolve.extensions
    config.resolve.extensions
        .merge(
            paths.moduleFileExtensions
                .map(ext => `.${ext}`)
                .filter(ext => useTypeScript || !ext.includes('ts'))
        )
        .end();

    // webpackConfig.resolve.modules
    config.resolve.modules
        .add('node_modules')
        .add(paths.appNodeModules)
        .end();

    // webpackConfig.module
    config.module
        .rule('compile')
        .oneOf('media')
        .test([/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/])
        .loader(require.resolve('url-loader'))
        .options({
            limit: imageInlineSizeLimit,
            name: 'static/media/[name].[hash:8].[ext]'
        })
        .end();

    config.merge({
        module: {
            strictExportPresence: true
        }
    });

    return config;
};

module.exports = webpackConfigFactory;
