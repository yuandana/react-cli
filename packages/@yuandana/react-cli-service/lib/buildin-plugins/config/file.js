module.exports = api => {
    api.chainWebpack(webpackChainConfig => {
        webpackChainConfig.module
            .rule('file')
            .test(/\.(svg|woff|woff2|eot|ttf|otf)$/)
            .use('file-loader')
            .loader(require.resolve('file-loader'))
            .options({
                name: 'static/media/[name].[hash:8].[ext]'
            })
            .end();
    });
};
