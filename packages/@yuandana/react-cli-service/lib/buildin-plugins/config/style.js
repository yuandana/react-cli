const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const postcssNormalize = require('postcss-normalize');
const getCSSModuleLocalIdent = require('../../react-dev-utils/get-css-module-local-ident');
const shouldUseSourceMap = process.env.GENERATE_SOURCEMAP !== 'false';
const shouldUseRelativeAssetPaths = process.env.REACT_CLI_PUBLICPATH === './';

const resolveStyleLoader = ({
    webpackChainConfig,
    ruleName,
    cssOptions = {},
    preProcessor
}) => {
    const isEnvProduction = process.env.REACT_CLI_MODE === 'production';

    if (isEnvProduction) {
        webpackChainConfig.module
            .rule(ruleName)
            .use('mini-css-extract-loader')
            .loader(MiniCssExtractPlugin.loader);
    } else {
        webpackChainConfig.module
            .rule(ruleName)
            .use('style-loader')
            .loader(require.resolve('style-loader'))
            .options(
                shouldUseRelativeAssetPaths ? { publicPath: '../../' } : {}
            );
    }
    webpackChainConfig.module
        .rule(ruleName)
        .use('css-loader')
        .loader(require.resolve('css-loader'))
        .options(cssOptions);

    webpackChainConfig.module
        .rule(ruleName)
        .use('postcss-loader')
        .loader(require.resolve('postcss-loader'))
        .options({
            // Necessary for external CSS imports to work
            // https://github.com/facebook/create-react-app/issues/2677
            ident: 'postcss',
            plugins: () => [
                require('postcss-flexbugs-fixes'),
                require('postcss-preset-env')({
                    // autoprefixer: {
                    //     flexbox: 'no-2009'
                    // },
                    stage: 3
                }),
                // Adds PostCSS Normalize as the reset css with default options,
                // so that it honors browserslist config in package.json
                // which in turn let's users customize the target behavior as per their needs.
                postcssNormalize()
            ],
            sourceMap: isEnvProduction && shouldUseSourceMap
        });

    if (preProcessor) {
        webpackChainConfig.module
            .rule(ruleName)
            .use('resolve-url-loader')
            .loader(require.resolve('resolve-url-loader'))
            .options({
                sourceMap: isEnvProduction && shouldUseSourceMap
            });
        webpackChainConfig.module
            .rule(ruleName)
            .use(preProcessor)
            .loader(require.resolve(preProcessor))
            .options({
                sourceMap: true
            });
    }
};

module.exports = (api, options) => {
    api.chainWebpack(webpackChainConfig => {
        const cssRegex = /\.css$/;
        const cssModuleRegex = /\.module\.css$/;
        const sassRegex = /\.(scss|sass)$/;
        const sassModuleRegex = /\.module\.(scss|sass)$/;
        const lessRegex = /\.(less)/;
        const lessModuleRegex = /\.module\.(less)$/;

        const isEnvProduction = process.env.REACT_CLI_MODE === 'production';
        /**
         * css
         */
        webpackChainConfig.module
            .rule('css')
            .test(cssRegex)
            .exclude.add(cssModuleRegex)
            .end();
        resolveStyleLoader({
            webpackChainConfig,
            ruleName: 'css',
            cssOptions: {
                importLoaders: 1,
                sourceMap: isEnvProduction && shouldUseSourceMap
            }
        });

        /**
         * css module
         */
        webpackChainConfig.module
            .rule('css-module')
            .test(cssModuleRegex)
            .end();
        resolveStyleLoader({
            webpackChainConfig,
            ruleName: 'css-module',
            cssOptions: {
                importLoaders: 1,
                sourceMap: isEnvProduction && shouldUseSourceMap,
                modules: true,
                getLocalIdent: getCSSModuleLocalIdent
            }
        });

        /**
         * sass
         */
        webpackChainConfig.module
            .rule('sass')
            .test(sassRegex)
            .exclude.add(sassModuleRegex)
            .end();
        resolveStyleLoader({
            webpackChainConfig,
            ruleName: 'sass',
            cssOptions: {
                importLoaders: 2,
                sourceMap: isEnvProduction && shouldUseSourceMap
            },
            preProcessor: 'sass-loader'
        });

        /**
         * sass module
         */
        webpackChainConfig.module
            .rule('sass-module')
            .test(sassModuleRegex)
            .end();
        resolveStyleLoader({
            webpackChainConfig,
            ruleName: 'sass-module',
            cssOptions: {
                importLoaders: 2,
                sourceMap: isEnvProduction && shouldUseSourceMap,
                modules: true,
                getLocalIdent: getCSSModuleLocalIdent
            },
            preProcessor: 'sass-loader'
        });

        /**
         * less
         */
        webpackChainConfig.module
            .rule('less')
            .test(lessRegex)
            .exclude.add(lessModuleRegex)
            .end();
        resolveStyleLoader({
            webpackChainConfig,
            ruleName: 'less',
            cssOptions: {
                importLoaders: 2,
                sourceMap: isEnvProduction && shouldUseSourceMap
            },
            preProcessor: 'less-loader'
        });

        /**
         * less module
         */
        webpackChainConfig.module
            .rule('less-module')
            .test(lessModuleRegex)
            .end();
        resolveStyleLoader({
            webpackChainConfig,
            ruleName: 'less-module',
            cssOptions: {
                importLoaders: 2,
                sourceMap: isEnvProduction && shouldUseSourceMap,
                modules: true,
                getLocalIdent: getCSSModuleLocalIdent
            },
            preProcessor: 'less-loader'
        });
    });
};
