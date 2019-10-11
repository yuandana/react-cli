const inquirer = require('inquirer');
const PromptApi = require('./prompt-api');
const getPromptModules = require('./prompt-modules');

class Prompt {
    constructor() {
        this.presetPrompts = [
            {
                name: 'preset',
                type: 'list',
                message: `Please pick a preset:`,
                choices: [
                    {
                        name: 'Manually select features',
                        value: '__manual__'
                    }
                ]
            }
        ];
        this.featurePrompts = [];
        this.promptCompleteCbs = [];
    }

    isManualMode(answers) {
        return answers.preset === '__manual__';
    }

    resolveFinalPrompts() {
        this.featurePrompts.forEach(prompt => {
            const isOriginalWhen = prompt.when || (() => true);
            prompt.when = answers => {
                return this.isManualMode(answers) && isOriginalWhen(answers);
            };
        });
        const finalFeaturePrompts = {
            name: 'features',
            // when: this.isManualMode,
            type: 'checkbox',
            message: 'Check the features needed for your project:',
            choices: this.featurePrompts,
            pageSize: 10
        };
        // return [...this.presetPrompts, finalFeaturePrompts];
        return [finalFeaturePrompts];
    }

    async resolvePresetByPrompts() {
        const promptModules = getPromptModules();
        const promptApi = new PromptApi(this);
        // 利用 promptApi 将prompt注册到 this 上
        promptModules.forEach(m => m(promptApi));
        const answers = await inquirer.prompt(this.resolveFinalPrompts());
        // 调用所有可配置的prompt callBack 得到preset
        let preset = {
            plugins: {}
        };
        this.promptCompleteCbs.forEach(cb => cb(answers, preset));
        return preset;
    }
}

module.exports = Prompt;

/**
 * 根据提示及用户选项返回配置文件
 *
 */
// exports.resolveIntroPrompts = () => {
// 获取用户需要的配置
// resolveIntroPrompts
// Please pick a preset: Manually select features
// default
//      babel eslint
// manually select features
// Check the features needed for your project: (Press <space> to select, <a> to toggle all, <i> to invert selection)
//  Babel
//  TypeScript
//  Progressive Web App (PWA) Support
//  Router
//  redux
//  CSS Pre-processors
//  Linter/Formatter
//  Unit Testing
//  E2E Testing
// Use class-style component syntax
// Use Babel alongside TypeScript (required for modern mode, auto-detected polyfills, transpiling JSX)? (Y/n)
// Use history mode for router? (Requires proper server setup for index fallback in production) (Y/n)
// Pick a CSS pre-processor (PostCSS, Autoprefixer and CSS Modules are supported by default): (Use arrow keys)
//  Sass/SCSS (with dart-sass)
//  Sass/SCSS (with node-sass)
//  Less
//  Stylus
// Pick a linter / formatter config: (Use arrow keys)
// TSLint
// ESLint with error prevention only
// ESLint + Airbnb config
// ESLint + Standard config
// ESLint + Prettier
// Pick additional lint features: (Press <space> to select, <a> to toggle all, <i> to invert selection)
// Lint on save
// Lint and fix on commit
// Pick a unit testing solution: (Use arrow keys)
// Mocha + Chai
// Jest
// Where do you prefer placing config for Babel, PostCSS, ESLint, etc.? (Use arrow keys)
// In dedicated config files
// In package.json
// 根据配置信息
// 1. 创建目录
// 2. 输出 package.json
//    2.1 react-cli-service 依赖
//    2.2 相关 cli 插件依赖添加（根据配置）
// 3.
// };
