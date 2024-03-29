module.exports = cli => {
    cli.injectFeature({
        name: 'Babel',
        value: 'babel',
        description:
            'Transpile modern JavaScript to older versions (for compatibility)',
        link: 'https://babeljs.io/',
        checked: true
    });

    cli.onPromptComplete((answers, preset) => {
        if (answers.features.includes('ts')) {
            if (!answers.useTsWithBabel) {
                return;
            }
        } else if (!answers.features.includes('babel')) {
            return;
        }
        preset.plugins['@yuandana/react-cli-plugin-babel'] = {};
    });
};
