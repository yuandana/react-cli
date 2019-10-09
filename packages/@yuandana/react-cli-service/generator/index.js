module.exports = (api, cliOptions) => {
    api.render('./template');

    api.extendPackage({
        scripts: {
            start: 'react-cli-service start',
            build: 'react-cli-service build'
        }
    });
};
