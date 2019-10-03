const Prompt = require('./prompt');

/**
 * 获取远端的preset
 */
const loadRemotePreset = () => {};

/**
 * 获取本地的preset
 */
const loadLocalPreset = () => {};

/**
 * 获取本地或者远端的 preset
 * @param {} presetArgs
 */
const resolveLocalOrRemotePreset = presetArgs => {
    // 解析  presetArgs

    // 查询本地是否有存储
    // 查询远端是否有存储
    loadRemotePreset();
};

// /**
//  * 将 prompt answer 转化为 preset
//  *
//  * @param {Object} answer
//  */
// const answerToPreset = answer => {
//     return answer;
// };

/**
 * 提示并获取配置
 */
const promptAndResolvePreset = async () => {
    const prompt = new Prompt();
    const preset = await prompt.resolvePresetByPrompts();
    return preset;
};

exports.defaultPreset = {
    router: false,
    reactx: false,
    useConfigFiles: true,
    cssPreprocessor: undefined,
    plugins: {
        '@yuandana/react-cli-plugin-babel': {},
        '@yuandana/react-cli-plugin-eslint': {
            config: 'base',
            lintOn: ['save']
        }
    }
};

exports.resolvePreset = async cliOptions => {
    let preset;
    // 如果命令行参数重指定了 preset
    // react create hello-word --preset [some-preset]
    if (cliOptions.preset) {
        preset = resolveLocalOrRemotePreset(cliOptions.preset);
    } else if (cliOptions.default) {
        preset = exports.defaultPreset;
    } else {
        preset = await promptAndResolvePreset();
    }
    return preset;
};
