module.exports = () => {
    return [
        'babel'
        // 'typescript',
        // 'pwa',
        // 'router',
        // 'vuex',
        // 'cssPreprocessors',
        // 'linter',
        // 'unit',
        // 'e2e'
    ].map(file => require(`./${file}`));
};
