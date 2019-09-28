/**
 * 项目创建函数
 *
 * @param {String} projectName
 * @param {Object} options
 */
async function create(projectName, options) {
    const cwd = options.cwd || process.cwd();
    const inCurrent = projectName === '.';
    const name = inCurrent ? path.relative('../', cwd) : projectName;
    console.log('TCL: create -> name', name);
    const targetDir = path.resolve(cwd, projectName || '.');

    if (fs.existsSync(targetDir)) {
        if (options.force) {
            await fs.remove(targetDir);
        } else {
            // await clearConsole();
            if (inCurrent) {
                const { ok } = await inquirer.prompt([
                    {
                        name: 'ok',
                        type: 'confirm',
                        message: `Generate project in current directory?`
                    }
                ]);
                if (!ok) {
                    return;
                }
            } else {
                const { action } = await inquirer.prompt([
                    {
                        name: 'action',
                        type: 'list',
                        message: `Target directory ${chalk.cyan(
                            targetDir
                        )} already exists. Pick an action:`,
                        choices: [
                            { name: 'Overwrite', value: 'overwrite' },
                            { name: 'Merge', value: 'merge' },
                            { name: 'Cancel', value: false }
                        ]
                    }
                ]);
                if (!action) {
                    return;
                } else if (action === 'overwrite') {
                    console.log(`\nRemoving ${chalk.cyan(targetDir)}...`);
                    await fs.remove(targetDir);
                }
            }
        }
    }
}

module.exports = (...args) => {
    return create(...args).catch(err => {
        stopSpinner(false); // do not persist
        error(err);
        if (!process.env.VUE_CLI_TEST) {
            process.exit(1);
        }
    });
};