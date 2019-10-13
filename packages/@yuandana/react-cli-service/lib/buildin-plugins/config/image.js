module.exports = api => {
    api.chainWebpack(webpackChainConfig => {
        webpackChainConfig.module
            .rule('image')
            .test([/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/])
            .use('url-loader')
            .loader(require.resolve('url-loader'))
            .options({
                name: 'static/media/[name].[hash:8].[ext]'
            })
            .end();
    });
};
