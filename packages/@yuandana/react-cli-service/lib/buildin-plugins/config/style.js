module.exports = api => {
    api.chainWebpack(webpackChainConfig => {
        webpackChainConfig.module
            .rule('style')
            .test(/\.css$/)
            .exclude.add(/\.module\.css$/)
            .end()
            .use('style-loader')
            .loader(require.resolve('style-loader'))
            .end()
            .use('css-loader')
            .loader(require.resolve('css-loader'))
            .end()
            .use('postcss-loader')
            .loader(require.resolve('postcss-loader'))
            .options({
                ident: 'postcss',
                plugins: () => [
                    require('postcss-flexbugs-fixes'),
                    require('autoprefixer')({
                        browsers: [
                            '>1%',
                            'last 4 versions',
                            'Firefox ESR',
                            'not ie < 9' // React doesn't support IE8 anyway
                        ],
                        flexbox: 'no-2009'
                    })
                ]
            })
            .end();
    });
};
