module.exports = (api, options) => {
    api.chainWebpack(webpackConfig => {
        const mode = process.env.REACT_CLI_MODE || 'production';
        const isEnvProduction = mode === 'production';
        const cwd = api.getCwd();

        // Process application JS with Babel.
        // The preset includes JSX, Flow, TypeScript, and some ESnext features.
        webpackConfig.module
            .rule('babel')
            .test(/\.(js|mjs|jsx|ts|tsx)$/)
            .include.add(`${cwd}/src`)
            .end()
            .use('babel-loader')
            .loader(require.resolve('babel-loader'))
            .options({
                customize: require.resolve(
                    'babel-preset-react-app/webpack-overrides'
                ),

                plugins: [
                    [
                        require.resolve('babel-plugin-named-asset-import'),
                        {
                            loaderMap: {
                                svg: {
                                    ReactComponent:
                                        '@svgr/webpack?-svgo,+titleProp,+ref![path]'
                                }
                            }
                        }
                    ]
                ],
                // This is a feature of `babel-loader` for webpack (not Babel itself).
                // It enables caching results in ./node_modules/.cache/babel-loader/
                // directory for faster rebuilds.
                cacheDirectory: true,
                // See #6846 for context on why cacheCompression is disabled
                cacheCompression: false,
                compact: isEnvProduction
            });
    });
};
