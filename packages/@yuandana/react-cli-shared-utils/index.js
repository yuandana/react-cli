['env', 'logger', 'spinner', 'console', 'validate'].forEach(m => {
    Object.assign(exports, require(`./lib/${m}`));
});

exports.chalk = require('chalk');
exports.execa = require('execa');
