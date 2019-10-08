module.exports = api => {
    api.chainWebpack(webpackChainConfig => {
        webpackChainConfig.module
            .rule('file')
            .test(/\.(bmp|png|svg|jpe?g|gif|woff|woff2|eot|ttf|otf)$/)
            // .exclude.add(/\.(js|mjs|jsx|ts|tsx)$/, /\.html$/, /\.json$/)
            .use('file-loader')
            .loader(require.resolve('file-loader'))
            .options({
                name: 'static/media/[name].[hash:8].[ext]'
            })
            .end();
    });
};
