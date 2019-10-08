const EventEmitter = require('events');
const spawn = require('cross-spawn');
// const execa = require('execa');
const supportPkgManagerList = ['npm', 'yarn'];

function checkPackageManagerIsSupported(pkgManager) {
    if (supportPkgManagerList.indexOf(pkgManager) === -1) {
        throw new Error(`Unknown package manager: ${pkgManager}`);
    }
}

class InstallProgress extends EventEmitter {
    constructor() {
        super();

        this._progress = -1;
    }

    get progress() {
        return this._progress;
    }

    set progress(value) {
        this._progress = value;
        this.emit('progress', value);
    }

    get enabled() {
        return this._progress !== -1;
    }

    set enabled(value) {
        this.progress = value ? 0 : -1;
    }

    log(value) {
        this.emit('log', value);
    }
}

const progress = (exports.progress = new InstallProgress());

function executeCommand(command, args, targetDir) {
    return new Promise((resolve, reject) => {
        const apiMode = process.env.REACT_CLI_API_MODE;

        progress.enabled = false;

        if (apiMode) {
            if (command === 'npm') {
                // TODO when this is supported
            } else if (command === 'yarn') {
                args.push('--json');
            }
        }

        const child = spawn(command, args, {
            cwd: targetDir,
            stdio: [
                'inherit',
                apiMode ? 'pipe' : 'inherit',
                !apiMode && command === 'yarn' ? 'pipe' : 'inherit'
            ]
        });

        child.on('close', code => {
            if (code !== 0) {
                reject(`command failed: ${command} ${args.join(' ')}`);
                return;
            }
            resolve();
        });

        child.on('exit', code => {});
    });
}

exports.installDeps = async (targetDir, command, cliRegistry) => {
    checkPackageManagerIsSupported(command);

    const args = [];

    if (command === 'npm') {
        args.push('install', '--loglevel', 'error');
    } else if (command === 'yarn') {
        // do nothing
    }

    await executeCommand(command, args, targetDir);
};
