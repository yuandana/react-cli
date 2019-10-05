const paths = require('../paths');

const idToPlugin = id => ({
    id: id.replace(/^.\//, 'built-in:'),
    apply: require(`${
        id.indexOf('./') === 0 ? id : paths.appNodeModules + '/' + id
    }`)
});
const builtInPluginList = [
    './base-webpack-config',
    './css',
    './start',
    './build'
];

exports.builtInPlugins = builtInPluginList.map(idToPlugin);
exports.idToPlugin = idToPlugin;
