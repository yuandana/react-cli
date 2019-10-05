module.exports = api => {
    api.chainWebpack(webpackChainConfig => {
        webpackChainConfig.module
            .rule('style')
            .test(/\.css$/)
            .exclude.add(/\.module\.css$/)
            .end()
            .use('style-loader')
            .loader(require.resolve('style-loader'))
            .end();
    });
};
