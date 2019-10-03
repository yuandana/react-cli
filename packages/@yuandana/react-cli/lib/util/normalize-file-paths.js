const slash = require('slash');

// normalize file paths on windows
// all paths are converted to use / instead of \
module.exports = function normalizeFilePaths(files) {
    Object.keys(files).forEach(file => {
        const normalized = slash(file);
        if (file !== normalized) {
            files[normalized] = files[file];
            delete files[file];
        }
    });
    return files;
};
