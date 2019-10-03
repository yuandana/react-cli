class PromptApi {
    constructor(promptInstance) {
        this.promptInstance = promptInstance;
    }

    injectFeature(prompt) {
        this.promptInstance.featurePrompts.push(prompt);
    }

    onPromptComplete(cb) {
        this.promptInstance.promptCompleteCbs.push(cb);
    }
}

module.exports = PromptApi;
