const ora = require('ora');
const spinner = ora();

exports.stopSpinner = persist => {
    if (lastMsg && persist !== false) {
        spinner.stopAndPersist({
            symbol: lastMsg.symbol,
            text: lastMsg.text
        });
    } else {
        spinner.stop();
    }
    lastMsg = null;
};
