const idToPlugin = id => ({
    id,
    apply: require(id)
});
const builtInPluginList = ['start', 'build'];

exports.builtInPlugins = builtInPluginList.map(idToPlugin);
exports.idToPlugin = idToPlugin;
