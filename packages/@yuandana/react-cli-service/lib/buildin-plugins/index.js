const paths = require('../paths');

const idToPlugin = id => ({
    id: id.replace(/^.\//, 'built-in:'),
    apply: require(`${
        id.indexOf('./') === 0 ? id : paths.appNodeModules + '/' + id
    }`)
});
const builtinPlugins = [
    './config/base',
    './config/style',
    './config/image',
    './config/file',
    './command/start',
    './command/build'
];

exports.builtinPlugins = builtinPlugins.map(idToPlugin);
exports.idToPlugin = idToPlugin;
