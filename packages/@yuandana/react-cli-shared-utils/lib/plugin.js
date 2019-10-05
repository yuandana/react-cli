const pluginRE = /^(@yuandana\/|react-|@[\w-]+\/react-)cli-plugin-/;
const scopeRE = /^@[\w-]+\//;
const officialRE = /^@yuandana\//;

exports.isPlugin = id => pluginRE.test(id);

exports.isOfficialPlugin = id => exports.isPlugin(id) && officialRE.test(id);

exports.toShortPluginId = id => id.replace(pluginRE, '');

exports.resolvePluginId = id => {
    // already full id
    // e.g. react-cli-plugin-foo, @yuandana/react-cli-plugin-foo, @bar/react-cli-plugin-foo
    if (pluginRE.test(id)) {
        return id;
    }
    // scoped short
    // e.g. @yuandana/foo, @bar/foo
    if (id.charAt(0) === '@') {
        const scopeMatch = id.match(scopeRE);
        if (scopeMatch) {
            const scope = scopeMatch[0];
            const shortId = id.replace(scopeRE, '');
            return `${scope}${
                scope === '@yuandana/' ? `` : `react-`
            }cli-plugin-${shortId}`;
        }
    }
    // default short
    // e.g. foo
    return `react-cli-plugin-${id}`;
};

exports.matchesPluginId = (input, full) => {
    const short = full.replace(pluginRE, '');
    return (
        // input is full
        full === input ||
        // input is short without scope
        short === input ||
        // input is short with scope
        short === input.replace(scopeRE, '')
    );
};

exports.getPluginLink = id => {
    if (officialRE.test(id)) {
        return `https://github.com/yuandana/react-cli/tree/dev/packages/%40yuandana/react-cli-plugin-${exports.toShortPluginId(
            id
        )}`;
    }
    let pkg = {};
    try {
        pkg = require(`${id}/package.json`);
    } catch (e) {}
    return (
        pkg.homepage ||
        (pkg.repository && pkg.repository.url) ||
        `https://www.npmjs.com/package/${id.replace(`/`, `%2F`)}`
    );
};
