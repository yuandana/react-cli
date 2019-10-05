const merge = require('deepmerge');
const mergeDeps = require('./util/merge-deps');

const isString = val => typeof val === 'string';
const isFunction = val => typeof val === 'function';
const isObject = val => val && typeof val === 'object';
const mergeArrayWithDedupe = (a, b) => Array.from(new Set([...a, ...b]));

class PluginGeneratorApi {
    constructor(id, projectGenerator) {
        this.id = id;
        this.projectGenerator = projectGenerator;
    }
    /**
     * Extend the package.json of the project.
     * Nested fields are deep-merged unless `{ merge: false }` is passed.
     * Also resolves dependency conflicts between plugins.
     * Tool configuration fields may be extracted into standalone files before
     * files are written to disk.
     *
     * @param {object | () => object} fields - Fields to merge.
     */
    extendPackage(fields) {
        const pkg = this.projectGenerator.pkg;
        const toMerge = isFunction(fields) ? fields(pkg) : fields;
        for (const key in toMerge) {
            const value = toMerge[key];
            const existing = pkg[key];
            if (
                isObject(value) &&
                (key === 'dependencies' || key === 'devDependencies')
            ) {
                // use special version resolution merge
                pkg[key] = mergeDeps(
                    this.id,
                    existing || {},
                    value,
                    this.projectGenerator.depSources
                );
            } else if (!(key in pkg)) {
                pkg[key] = value;
            } else if (Array.isArray(value) && Array.isArray(existing)) {
                pkg[key] = mergeArrayWithDedupe(existing, value);
            } else if (isObject(value) && isObject(existing)) {
                pkg[key] = merge(existing, value, {
                    arrayMerge: mergeArrayWithDedupe
                });
            } else {
                pkg[key] = value;
            }
        }
    }
}

module.exports = PluginGeneratorApi;
