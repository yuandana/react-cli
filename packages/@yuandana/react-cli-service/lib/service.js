class Service {
    constructor() {}

    async run(name, args = {}, rawArgv = []) {}

    async init(mode = process.env.REACT_CLI_MODE) {}
}

module.exports = Service;
