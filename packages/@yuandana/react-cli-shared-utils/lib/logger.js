const chalk = require('chalk');
const padStart = require('string.prototype.padstart');
const EventEmitter = require('events');

exports.events = new EventEmitter();

function _log(type, tag, message) {
    if (process.env.REACT_CLI_API_MODE && message) {
        exports.events.emit('log', {
            message,
            type,
            tag
        });
    }
}

const format = (label, msg) => {
    return msg
        .split('\n')
        .map((line, i) => {
            return i === 0
                ? `${label} ${line}`
                : padStart(line, chalk.reset(label).length);
        })
        .join('\n');
};

const chalkTag = msg => chalk.bgBlackBright.white.dim(` ${msg} `);

exports.log = (msg = '', tag = null) => {
    tag ? console.log(format(chalkTag(tag), msg)) : console.log(msg);
    _log('log', tag, msg);
};

exports.info = (msg, tag = null) => {
    console.log(
        format(chalk.bgBlue.black(' INFO ') + (tag ? chalkTag(tag) : ''), msg)
    );
    _log('info', tag, msg);
};

exports.done = (msg, tag = null) => {
    console.log(
        format(chalk.bgGreen.black(' DONE ') + (tag ? chalkTag(tag) : ''), msg)
    );
    _log('done', tag, msg);
};

exports.warn = (msg, tag = null) => {
    console.warn(
        format(
            chalk.bgYellow.black(' WARN ') + (tag ? chalkTag(tag) : ''),
            chalk.yellow(msg)
        )
    );
    _log('warn', tag, msg);
};

exports.error = (msg, tag = null) => {
    console.error(
        format(
            chalk.bgRed(' ERROR ') + (tag ? chalkTag(tag) : ''),
            chalk.red(msg)
        )
    );
    _log('error', tag, msg);
    if (msg instanceof Error) {
        console.error(msg.stack);
        _log('error', tag, msg.stack);
    }
};

// silent all logs except errors during tests and keep record
if (process.env.REACT_CLI_TEST) {
    require('./_silence')('logs', exports);
}
