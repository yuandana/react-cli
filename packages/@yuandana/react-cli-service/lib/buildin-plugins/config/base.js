const paths = require('../../paths');
const path = require('path');
const modules = require('../../modules');
const getClientEnvironment = require('../..//env');
const fs = require('fs-extra');
// Source maps are resource heavy and can cause out of memory issue for large source files.
const shouldUseSourceMap = process.env.GENERATE_SOURCEMAP !== 'false';
// Some apps do not need the benefits of saving a web request, so not inlining the chunk
// makes for a smoother build process.
const shouldInlineRuntimeChunk = process.env.INLINE_RUNTIME_CHUNK !== 'false';

const imageInlineSizeLimit = parseInt(
    process.env.IMAGE_INLINE_SIZE_LIMIT || '10000'
);
const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');
const postcssSafeParser = require('postcss-safe-parser');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const isWsl = require('is-wsl');
const PnpWebpackPlugin = require('pnp-webpack-plugin');
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const ManifestPlugin = require('webpack-manifest-plugin');
const WorkboxWebpackPlugin = require('workbox-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ModuleScopePlugin = require('../../react-dev-utils/module-scope-plugin');
const InlineChunkHtmlPlugin = require('../../react-dev-utils/inline-chunk-html-plugin');
const InterpolateHtmlPlugin = require('../../react-dev-utils/interpolate-html-plugin');
const ModuleNotFoundPlugin = require('../../react-dev-utils/module-not-found-plugin');
const WatchMissingNodeModulesPlugin = require('../../react-dev-utils/watch-missing-node-modules-plugin');
const ForkTsCheckerWebpackPlugin = require('../../react-dev-utils/fork-ts-checker-webpack-plugin');
const appPackageJson = require(paths.appPackageJson);

module.exports = api => {
    api.chainWebpack(webpackChainConfig => {
        // mode === 'production'
        // mode === 'development'
        // mode === 'test'

        const mode = process.env.REACT_CLI_MODE || 'production';

        const isEnvDevelopment = mode === 'development';
        const isEnvProduction = mode === 'production';

        // Webpack uses `publicPath` to determine where the app is being served from.
        // It requires a trailing slash, or the file assets will get an incorrect path.
        // In development, we always serve from the root. This makes config easier.
        const publicPath = isEnvProduction
            ? paths.servedPath
            : isEnvDevelopment && '/';
        // `publicUrl` is just like `publicPath`, but we will provide it to our app
        // as %PUBLIC_URL% in `index.html` and `process.env.PUBLIC_URL` in JavaScript.
        // Omit trailing slash as %PUBLIC_URL%/xyz looks better than %PUBLIC_URL%xyz.
        const publicUrl = isEnvProduction
            ? publicPath.slice(0, -1)
            : isEnvDevelopment && '';
        // Get environment variables to inject into our app.
        const env = getClientEnvironment(publicUrl);

        // Variable used for enabling profiling in Production
        // passed into alias object. Uses a flag if passed into the build command
        const isEnvProductionProfile =
            isEnvProduction && process.argv.includes('--profile');

        // Check if TypeScript is setup
        const useTypeScript = fs.existsSync(paths.appTsConfig);

        /**
         * mode
         * bail
         * devtool
         */
        webpackChainConfig
            .mode(mode)
            .bail(isEnvProduction)
            .devtool(
                isEnvProduction
                    ? shouldUseSourceMap
                        ? 'source-map'
                        : false
                    : isEnvDevelopment && 'cheap-module-source-map'
            )
            .end();

        /**
         * webpackConfig.entry
         */
        if (isEnvDevelopment) {
            webpackChainConfig
                .entry('app')
                .add(
                    require.resolve(
                        '../../react-dev-utils/webpack-hot-dev-client'
                    )
                )
                .end();
        }
        webpackChainConfig
            .entry('app')
            .add(paths.appIndexJs)
            .end();

        /**
         * webpackConfig.output
         */
        webpackChainConfig.output
            // The dist folder.
            .path(isEnvProduction ? paths.appDist : undefined)
            // Add /* filename */ comments to generated require()s in the output.
            .pathinfo(isEnvDevelopment)
            // There will be one main bundle, and one file per asynchronous chunk.
            // In development, it does not produce real files.
            .filename(
                isEnvProduction
                    ? 'static/js/[name].[hash:8].js'
                    : isEnvDevelopment && 'static/js/bundle.js'
            )
            // There are also additional JS chunk files if you use code splitting.
            .chunkFilename(
                isEnvProduction
                    ? 'static/js/[name].[hash:8].chunk.js'
                    : isEnvDevelopment && 'static/js/[name].chunk.js'
            )
            // We inferred the "public path" (such as / or /my-project) from homepage.
            // We use "/" in development.
            .publicPath(publicPath)
            // Point sourcemap entries to original disk location (format as URL on Windows)
            .devtoolModuleFilenameTemplate(
                isEnvProduction
                    ? info =>
                          path
                              .relative(paths.appSrc, info.absoluteResourcePath)
                              .replace(/\\/g, '/')
                    : isEnvDevelopment &&
                          (info =>
                              path
                                  .resolve(info.absoluteResourcePath)
                                  .replace(/\\/g, '/'))
            )
            .jsonpFunction(`webpackJsonp${appPackageJson.name}`)
            .end();

        // /**
        //  * optimization
        //  */
        // webpackChainConfig.optimization
        //     .minimize(isEnvProduction)
        //     .splitChunks({
        //         chunks: 'all',
        //         name: false
        //     })
        //     .runtimeChunk({
        //         name: entrypoint => `runtime-${entrypoint.name}`
        //     })
        //     .end();

        // webpackChainConfig.optimization
        //     .minimizer('TerserPlugin')
        //     .use(TerserPlugin, [
        //         {
        //             terserOptions: {
        //                 parse: {
        //                     // We want terser to parse ecma 8 code. However, we don't want it
        //                     // to apply any minification steps that turns valid ecma 5 code
        //                     // into invalid ecma 5 code. This is why the 'compress' and 'output'
        //                     // sections only apply transformations that are ecma 5 safe
        //                     // https://github.com/facebook/create-react-app/pull/4234
        //                     ecma: 8
        //                 },
        //                 compress: {
        //                     ecma: 5,
        //                     warnings: false,
        //                     // Disabled because of an issue with Uglify breaking seemingly valid code:
        //                     // https://github.com/facebook/create-react-app/issues/2376
        //                     // Pending further investigation:
        //                     // https://github.com/mishoo/UglifyJS2/issues/2011
        //                     comparisons: false,
        //                     // Disabled because of an issue with Terser breaking valid code:
        //                     // https://github.com/facebook/create-react-app/issues/5250
        //                     // Pending further investigation:
        //                     // https://github.com/terser-js/terser/issues/120
        //                     inline: 2
        //                 },
        //                 mangle: {
        //                     safari10: true
        //                 },
        //                 // Added for profiling in devtools
        //                 keep_classnames: isEnvProductionProfile,
        //                 keep_fnames: isEnvProductionProfile,
        //                 output: {
        //                     ecma: 5,
        //                     comments: false,
        //                     // Turned on because emoji and regex is not minified properly using default
        //                     // https://github.com/facebook/create-react-app/issues/2488
        //                     ascii_only: true
        //                 }
        //             },
        //             // Use multi-process parallel running to improve the build speed
        //             // Default number of concurrent runs: os.cpus().length - 1
        //             // Disabled on WSL (Windows Subsystem for Linux) due to an issue with Terser
        //             // https://github.com/webpack-contrib/terser-webpack-plugin/issues/21
        //             parallel: !isWsl,
        //             // Enable file caching
        //             cache: true,
        //             sourceMap: shouldUseSourceMap
        //         }
        //     ]);

        // webpackChainConfig.optimization
        //     .minimizer('OptimizeCSSAssetsPlugin')
        //     .use(OptimizeCSSAssetsPlugin, [
        //         {
        //             cssProcessorOptions: {
        //                 parser: postcssSafeParser,
        //                 map: shouldUseSourceMap
        //                     ? {
        //                           // `inline: false` forces the sourcemap to be output into a
        //                           // separate file
        //                           inline: false,
        //                           // `annotation: true` appends the sourceMappingURL to the end of
        //                           // the css file, helping the browser find the sourcemap
        //                           annotation: true
        //                       }
        //                     : false
        //             }
        //         }
        //     ]);

        // /**
        //  * webpack.resolve.modules
        //  */
        // webpackChainConfig.resolve.modules
        //     .add('node_modules')
        //     .add(paths.appNodeModules);
        // modules.additionalModulePaths.forEach(path => {
        //     webpackChainConfig.resolve.modules.add(path);
        // });

        // /**
        //  * webpack.resolve.extensions
        //  */
        // paths.moduleFileExtensions
        //     .map(ext => `.${ext}`)
        //     .filter(ext => useTypeScript || !ext.includes('ts'))
        //     .forEach(extension => {
        //         webpackChainConfig.resolve.extensions.add(extension);
        //     });

        /**
         * webpack.resolve.alias
         */
        const aliasObject = {
            // Support React Native Web
            // https://www.smashingmagazine.com/2016/08/a-glimpse-into-the-future-with-react-native-for-web/
            'react-native': 'react-native-web',
            // Allows for better profiling with ReactDevTools
            ...(isEnvProductionProfile && {
                'react-dom$': 'react-dom/profiling',
                'scheduler/tracing': 'scheduler/tracing-profiling'
            }),
            ...(modules.webpackAliases || {})
        };
        Object.keys(aliasObject).forEach(key => {
            const value = aliasObject[key];
            if (key && value) {
                webpackChainConfig.resolve.alias.set(key, value);
            }
        });

        // /**
        //  * webpack.resolve.plugins
        //  */
        // // Adds support for installing with Plug'n'Play, leading to faster installs and adding
        // // guards against forgotten dependencies and such.
        // webpackChainConfig.resolve
        //     .plugin('PnpWebpackPlugin')
        //     .use(PnpWebpackPlugin);
        // // Prevents users from importing files from outside of src/ (or node_modules/).
        // // This often causes confusion because we only process files within src/ with babel.
        // // To fix this, we prevent you from importing files out of src/ -- if you'd like to,
        // // please link the files into your node_modules/ and let module-resolution kick in.
        // // Make sure your source files are compiled, as they will not be processed in any way.
        // webpackChainConfig.resolve
        //     .plugin('ModuleScopePlugin')
        //     .use(ModuleScopePlugin, [paths.appSrc, [paths.appPackageJson]]);

        // /**
        //  * webpack.resolveLoader.plugin
        //  */
        // webpackChainConfig.merge({
        //     resolveLoader: {
        //         plugin: {
        //             PnpWebpackPlugin: {
        //                 plugin: PnpWebpackPlugin.moduleLoader(module)
        //             }
        //         }
        //     }
        // });

        /**
         * webpack.plugins
         */
        // Generates an `index.html` file with the <script> injected.
        webpackChainConfig
            .plugin('HtmlWebpackPlugin')
            .use(HtmlWebpackPlugin, [
                {
                    inject: true,
                    template: paths.appHtml
                }
            ])
            .end();

        // // Inlines the webpack runtime script. This script is too small to warrant
        // // a network request.
        // // https://github.com/facebook/create-react-app/issues/5358
        // if (isEnvProduction && shouldInlineRuntimeChunk) {
        //     webpackChainConfig
        //         .plugin('InlineChunkHtmlPlugin')
        //         .after('HtmlWebpackPlugin')
        //         .use(InlineChunkHtmlPlugin, [
        //             HtmlWebpackPlugin,
        //             [/runtime-.+[.]js/]
        //         ]);
        // }

        // Makes some environment variables available in index.html.
        // The public URL is available as %PUBLIC_URL% in index.html, e.g.:
        // <link rel="icon" href="%PUBLIC_URL%/favicon.ico">
        // In production, it will be an empty string unless you specify "homepage"
        // in `package.json`, in which case it will be the pathname of that URL.
        // In development, this will be an empty string.
        webpackChainConfig
            .plugin('InterpolateHtmlPlugin')
            .after('HtmlWebpackPlugin')
            .use(InterpolateHtmlPlugin, [HtmlWebpackPlugin, env.raw]);

        // // This gives some necessary context to module not found errors, such as
        // // the requesting resource.
        // webpackChainConfig
        //     .plugin('ModuleNotFoundPlugin')
        //     .use(ModuleNotFoundPlugin, [paths.appPath]);

        // // Makes some environment variables available to the JS code, for example:
        // // if (process.env.NODE_ENV === 'production') { ... }. See `./env.js`.
        // // It is absolutely essential that NODE_ENV is set to production
        // // during a production build.
        // // Otherwise React will be compiled in the very slow development mode.
        // webpackChainConfig
        //     .plugin('DefinePlugin')
        //     .use(webpack.DefinePlugin, [env.stringified]);

        if (isEnvDevelopment) {
            // This is necessary to emit hot updates (currently CSS only):
            webpackChainConfig
                .plugin('HotModuleReplacementPlugin')
                .use(webpack.HotModuleReplacementPlugin);
            //     // Watcher doesn't work well if you mistype casing in a path so we use
            //     // a plugin that prints an error when you attempt to do this.
            //     // See https://github.com/facebook/create-react-app/issues/240
            //     webpackChainConfig
            //         .plugin('CaseSensitivePathsPlugin')
            //         .use(CaseSensitivePathsPlugin);
            //     // If you require a missing module and then `npm install` it, you still have
            //     // to restart the development server for Webpack to discover it. This plugin
            //     // makes the discovery automatic so you don't have to restart.
            //     // See https://github.com/facebook/create-react-app/issues/186
            //     webpackChainConfig
            //         .plugin('WatchMissingNodeModulesPlugin')
            //         .use(WatchMissingNodeModulesPlugin, [paths.appNodeModule]);
        }
        if (isEnvProduction) {
            webpackChainConfig
                .plugin('MiniCssExtractPlugin')
                .use(MiniCssExtractPlugin, [
                    {
                        // Options similar to the same options in webpackOptions.output
                        // both options are optional
                        filename: 'static/css/[name].[contenthash:8].css',
                        chunkFilename:
                            'static/css/[name].[contenthash:8].chunk.css'
                    }
                ]);
        }

        // // Generate an asset manifest file with the following content:
        // // - "files" key: Mapping of all asset filenames to their corresponding
        // //   output file so that tools can pick it up without having to parse
        // //   `index.html`
        // // - "entrypoints" key: Array of files which are included in `index.html`,
        // //   can be used to reconstruct the HTML if necessary
        // webpackChainConfig.plugin('ManifestPlugin').use(ManifestPlugin, [
        //     {
        //         fileName: 'asset-manifest.json',
        //         publicPath: publicPath,
        //         generate: (seed, files, entrypoints) => {
        //             const manifestFiles = files.reduce((manifest, file) => {
        //                 manifest[file.name] = file.path;
        //                 return manifest;
        //             }, seed);
        //             const entrypointFiles = entrypoints.main.filter(
        //                 fileName => !fileName.endsWith('.map')
        //             );

        //             return {
        //                 files: manifestFiles,
        //                 entrypoints: entrypointFiles
        //             };
        //         }
        //     }
        // ]);

        // // Moment.js is an extremely popular library that bundles large locale files
        // // by default due to how Webpack interprets its code. This is a practical
        // // solution that requires the user to opt into importing specific locales.
        // // https://github.com/jmblog/how-to-optimize-momentjs-with-webpack
        // // You can remove this if you don't use Moment.js:
        // webpackChainConfig
        //     .plugin('IgnorePlugin')
        //     .use(webpack.IgnorePlugin, [/^\.\/locale$/, /moment$/]);

        // // Generate a service worker script that will precache, and keep up to date,
        // // the HTML & assets that are part of the Webpack build.
        // isEnvProduction &&
        //     webpackChainConfig
        //         .plugin('WorkboxWebpackPlugin')
        //         .use(WorkboxWebpackPlugin.GenerateSW, [
        //             {
        //                 clientsClaim: true,
        //                 exclude: [/\.map$/, /asset-manifest\.json$/],
        //                 importWorkboxFrom: 'cdn',
        //                 navigateFallback: publicUrl + '/index.html',
        //                 navigateFallbackBlacklist: [
        //                     // Exclude URLs starting with /_, as they're likely an API call
        //                     new RegExp('^/_'),
        //                     // Exclude any URLs whose last part seems to be a file extension
        //                     // as they're likely a resource and not a SPA route.
        //                     // URLs containing a "?" character won't be blacklisted as they're likely
        //                     // a route with query params (e.g. auth callbacks).
        //                     new RegExp('/[^/?]+\\.[^/]+$')
        //                 ]
        //             }
        //         ]);
        // // TypeScript type checking
        // useTypeScript &&
        //     webpackChainConfig
        //         .plugin('ForkTsCheckerWebpackPlugin')
        //         .use(ForkTsCheckerWebpackPlugin, [
        //             {
        //                 typescript: resolve.sync('typescript', {
        //                     basedir: paths.appNodeModules
        //                 }),
        //                 async: isEnvDevelopment,
        //                 useTypescriptIncrementalApi: true,
        //                 checkSyntacticErrors: true,
        //                 resolveModuleNameModule: process.versions.pnp
        //                     ? `${__dirname}/pnpTs.js`
        //                     : undefined,
        //                 resolveTypeReferenceDirectiveModule: process.versions
        //                     .pnp
        //                     ? `${__dirname}/pnpTs.js`
        //                     : undefined,
        //                 tsconfig: paths.appTsConfig,
        //                 reportFiles: [
        //                     '**',
        //                     '!**/__tests__/**',
        //                     '!**/?(*.)(spec|test).*',
        //                     '!**/src/setupProxy.*',
        //                     '!**/src/setupTests.*'
        //                 ],
        //                 silent: true,
        //                 // The formatter is invoked directly in WebpackDevServerUtils during development
        //                 formatter: isEnvProduction
        //                     ? typescriptFormatter
        //                     : undefined
        //             }
        //         ]);

        webpackChainConfig.node
            .set('module', 'empty')
            .set('dgram', 'empty')
            .set('dns', 'mock')
            .set('fs', 'empty')
            .set('http2', 'empty')
            .set('net', 'empty')
            .set('tls', 'empty')
            .set('child_process', 'empty');

        webpackChainConfig.merge({
            module: {
                strictExportPresence: true
            },
            performance: false
        });
    });
};
