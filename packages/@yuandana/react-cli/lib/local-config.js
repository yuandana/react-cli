const fs = require('fs-extra');
const {
    createSchema,
    validate
} = require('@yuandana/react-cli-shared-utils/lib/validate');
const { getRcPath } = require('./util/rc-path');
const rcPath = getRcPath('.reactrc');

const presetSchema = createSchema(joi =>
    joi.object().keys({
        bare: joi.boolean(),
        useConfigFiles: joi.boolean(),
        router: joi.boolean(),
        routerHistoryMode: joi.boolean(),
        vuex: joi.boolean(),
        // TODO: remove 'sass' or make it equivalent to 'dart-sass' in v4
        cssPreprocessor: joi
            .string()
            .only(['sass', 'dart-sass', 'node-sass', 'less', 'stylus']),
        plugins: joi.object().required(),
        configs: joi.object()
    })
);

const configSchema = createSchema(joi =>
    joi.object().keys({
        latestVersion: joi.string().regex(/^\d+\.\d+\.\d+$/),
        lastChecked: joi.date().timestamp(),
        packageManager: joi.string().only(['yarn', 'npm']),
        useTaobaoRegistry: joi.boolean(),
        presets: joi.object().pattern(/^/, presetSchema)
    })
);

let cachedLocalConfig;
exports.loadLocalConfig = () => {
    if (cachedLocalConfig) {
        return cachedLocalConfig;
    }
    if (fs.existsSync(rcPath)) {
        try {
            cachedLocalConfig = JSON.parse(fs.readFileSync(rcPath, 'utf-8'));
        } catch (e) {
            error(
                `Error loading saved preferences: ` +
                    `~/.vuerc may be corrupted or have syntax errors. ` +
                    `Please fix/delete it and re-run vue-cli in manual mode.\n` +
                    `(${e.message})`
            );
            exit(1);
        }
        validate(cachedLocalConfig, schema, () => {
            error(
                `~/.vuerc may be outdated. ` +
                    `Please delete it and re-run vue-cli in manual mode.`
            );
        });
        return cachedLocalConfig;
    } else {
        return {};
    }
};

exports.saveLocalConfig = toSave => {
    const localConfig = Object.assign(
        cloneDeep(exports.loadLocalConfig()),
        toSave
    );
    for (const key in localConfig) {
        if (!(key in exports.defaults)) {
            delete localConfig[key];
        }
    }
    cachedLocalConfig = localConfig;
    try {
        fs.writeFileSync(rcPath, JSON.stringify(localConfig, null, 2));
    } catch (e) {
        error(
            `Error saving preferences: ` +
                `make sure you have write access to ${rcPath}.\n` +
                `(${e.message})`
        );
    }
};

exports.savePreset = (name, preset) => {
    const presets = cloneDeep(exports.loadLocalConfig().presets || {});
    presets[name] = preset;
    exports.saveLocalConfig({ presets });
};
