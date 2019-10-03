#!/usr/bin/env node

const chalk = require('chalk');
const semver = require('semver');
const requiredVersion = require('../package.json').engines.node;

// Check node version before requiring/doing anything else
// The user may be on a very old node version
// 在执行脚本之前检查node版本
// 防止用户可能使用比较旧的node版本
function checkNodeVersion(wanted, id) {
    if (!semver.satisfies(process.version, wanted)) {
        console.log(
            chalk.red(
                'You are using Node ' +
                    process.version +
                    ', but this version of ' +
                    id +
                    ' requires Node ' +
                    wanted +
                    '.\nPlease upgrade your Node version.'
            )
        );
        process.exit(1);
    }
}

function camelize(str) {
    return str.replace(/-(\w)/g, (_, c) => (c ? c.toUpperCase() : ''));
}

// commander passes the Command object itself as options,
// extract only actual options into a fresh object.
function cleanArgs(cmd) {
    const args = {};
    cmd.options.forEach(o => {
        const key = camelize(o.long.replace(/^--/, ''));
        // if an option is not present and Command has a method with the same name
        // it should not be copied
        if (typeof cmd[key] !== 'function' && typeof cmd[key] !== 'undefined') {
            args[key] = cmd[key];
        }
    });
    return args;
}

checkNodeVersion(requiredVersion, 'react-cli');

if (semver.satisfies(process.version, '9.x')) {
    console.log(
        chalk.red(
            `You are using Node ${process.version}.\n` +
                `Node.js 9.x has already reached end-of-life and will not be supported in future major releases.\n` +
                `It's strongly recommended to use an active LTS version instead.`
        )
    );
}

const program = require('commander');
const minimist = require('minimist');

program.version(require('../package').version).usage('<command> [options]');

program
    .command('create <project-name>')
    .description('create a new project powered by react-cli-service')
    // .option('-p, --preset <presetName>', 'Skip prompts and use saved or remote preset')
    // .option('-d, --default', 'Skip prompts and use default preset')
    // .option('-i, --inlinePreset <json>', 'Skip prompts and use inline JSON string as preset')
    // .option('-m, --packageManager <command>', 'Use specified npm client when installing dependencies')
    // .option('-r, --registry <url>', 'Use specified npm registry when installing dependencies (only for npm)')
    // .option('-g, --git [message]', 'Force git initialization with initial commit message')
    // .option('-n, --no-git', 'Skip git initialization')
    // .option('-f, --force', 'Overwrite target directory if it exists')
    // .option('-c, --clone', 'Use git clone when fetching remote preset')
    // .option('-x, --proxy', 'Use specified proxy when creating project')
    // .option('-b, --bare', 'Scaffold project without beginner instructions')
    .action((name, cmd) => {
        const options = cleanArgs(cmd);
        console.log('TCL: options', options);

        if (minimist(process.argv.slice(3))._.length > 1) {
            console.log(
                chalk.yellow(
                    "\n Info: You provided more than one argument. The first one will be used as the app's name, the rest are ignored."
                )
            );
        }
        // --git makes commander to default git to true
        if (process.argv.includes('-g') || process.argv.includes('--git')) {
            options.forceGit = true;
        }

        require('../lib/create')(name, options);
    });

// output help information on unknown commands
program.arguments('<command>').action(cmd => {
    program.outputHelp();
    console.log(`  ` + chalk.red(`Unknown command ${chalk.yellow(cmd)}.`));
    console.log();
});

// add some useful info on help
program.on('--help', () => {
    console.log();
    console.log(
        `  Run ${chalk.cyan(
            `vue <command> --help`
        )} for detailed usage of given command.`
    );
    console.log();
});

program.commands.forEach(c => c.on('--help', () => console.log()));

program.parse(process.argv);

// 如果没有任何参数时，输出 help 信息
// eg:react
if (!process.argv.slice(2).length) {
    program.outputHelp();
}
