#!/usr/bin/env node

const semver = require('semver');
const { error } = require('@yuandana/react-cli-shared-utils');
const requiredVersion = require('../package.json').engines.node;
const Service = require('../lib/service');

if (!semver.satisfies(process.version, requiredVersion)) {
    error(
        `You are using Node ${process.version}, but react-cli-service ` +
            `requires Node ${requiredVersion}.\nPlease upgrade your Node version.`
    );
    process.exit(1);
}

const service = new Service(process.env.REACT_CLI_CONTEXT || process.cwd());

const rawArgv = process.argv.slice(2);
const args = require('minimist')(rawArgv, {
    boolean: [
        // build
        'modern',
        'report',
        'report-json',
        'watch',
        // serve
        'open',
        'copy',
        'https',
        // inspect
        'verbose'
    ]
});
const command = args._[0];

service.run(command, args, rawArgv).catch(err => {
    error(err);
    process.exit(1);
});
