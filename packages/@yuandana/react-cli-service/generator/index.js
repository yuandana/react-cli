module.exports = (api, cliOptions) => {
    api.render('./template');

    api.extendPackage({
        scripts: {
            start: 'react-cli-service start',
            build: 'react-cli-service build'
        },
        dependencies: {
            react: '^16.10.2',
            'react-dom': '^16.10.2'
        }
    });
};
