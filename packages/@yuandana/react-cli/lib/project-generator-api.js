const merge = require('deepmerge');
const path = require('path');
const fs = require('fs-extra');
const ejs = require('ejs');
const { isBinaryFileSync } = require('isbinaryfile');
const mergeDeps = require('./util/merge-deps');

const isString = val => typeof val === 'string';
const isFunction = val => typeof val === 'function';
const isObject = val => val && typeof val === 'object';
const mergeArrayWithDedupe = (a, b) => Array.from(new Set([...a, ...b]));

function extractCallDir() {
    // extract api.render() callsite file location using error stack
    // 使用错误堆栈提取 api.render（）呼叫站点文件位置
    const obj = {};
    Error.captureStackTrace(obj);
    const callSite = obj.stack.split('\n')[3];
    const fileName = callSite.match(/\s\((.*):\d+:\d+\)$/)[1];
    return path.dirname(fileName);
}

const replaceBlockRE = /<%# REPLACE %>([^]*?)<%# END_REPLACE %>/g;
function renderFile(name, data, ejsOptions) {
    if (isBinaryFileSync(name)) {
        return fs.readFileSync(name); // return buffer
    }
    const template = fs.readFileSync(name, 'utf-8');

    // custom template inheritance via yaml front matter.
    // ---
    // extend: 'source-file'
    // replace: !!js/regexp /some-regex/
    // OR
    // replace:
    //   - !!js/regexp /foo/
    //   - !!js/regexp /bar/
    // ---
    const yaml = require('yaml-front-matter');
    const parsed = yaml.loadFront(template);
    const content = parsed.__content;
    let finalTemplate = content.trim() + `\n`;
    if (parsed.extend) {
        const extendPath = path.isAbsolute(parsed.extend)
            ? parsed.extend
            : resolve.sync(parsed.extend, { basedir: path.dirname(name) });
        finalTemplate = fs.readFileSync(extendPath, 'utf-8');
        if (parsed.replace) {
            if (Array.isArray(parsed.replace)) {
                const replaceMatch = content.match(replaceBlockRE);
                if (replaceMatch) {
                    const replaces = replaceMatch.map(m => {
                        return m.replace(replaceBlockRE, '$1').trim();
                    });
                    parsed.replace.forEach((r, i) => {
                        finalTemplate = finalTemplate.replace(r, replaces[i]);
                    });
                }
            } else {
                finalTemplate = finalTemplate.replace(
                    parsed.replace,
                    content.trim()
                );
            }
        }
        if (parsed.when) {
            finalTemplate =
                `<%_ if (${parsed.when}) { _%>` + finalTemplate + `<%_ } _%>`;
        }
    }

    return ejs.render(finalTemplate, data, ejsOptions);
}

class ProjectGeneratorApi {
    constructor(id, projectGenerator) {
        this.id = id;
        this.projectGenerator = projectGenerator;
    }
    /**
     * Extend the package.json of the project.
     * 扩展项目的 package.json 文件
     *
     * Nested fields are deep-merged unless `{ merge: false }` is passed.
     * 如果传递的 fields obj 不包含 `{ merge: false }` 则是深度合并
     *
     * Also resolves dependency conflicts between plugins.
     * 同时解决插件间的依赖冲突 `TODO: ？如何解决的`
     *
     * Tool configuration fields may be extracted into standalone files before
     * 工具字段可能会在提取之前提取到文件当中
     * files are written to disk.
     * 文件会被写入到磁盘上
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

    /**
     * Render template files into the virtual files tree object.
     * 将模版文件渲染到虚拟文件树对象上
     *
     * @param {string | object | FileMiddleware} source -
     *   Can be one of:
     *   - relative path to a directory;
     *   -  一个目录的相对路径
     *   - Object hash of { sourceTemplate: targetFile } mappings;
     *   - a custom file middleware function.
     *   - 一个定制的文件中间件方法
     * @param {object} [additionalData] -
     *    - additional data available to templates.
     *    - 模版可用的其他数据
     * @param {object} [ejsOptions]
     *    - options for ejs.
     *    - ejs 的 options
     */
    render(source, additionalData = {}, ejsOptions = {}) {
        const baseDir = extractCallDir();
        if (isString(source)) {
            source = path.resolve(baseDir, source);
            this._injectFileMiddleware(async files => {
                const data = this._resolveData(additionalData);
                const globby = require('globby');
                const _files = await globby(['**/*'], { cwd: source });
                for (const rawPath of _files) {
                    const targetPath = rawPath
                        .split('/')
                        .map(filename => {
                            // dotfiles are ignored when published to npm, therefore in templates
                            // we need to use underscore instead (e.g. "_gitignore")
                            if (
                                filename.charAt(0) === '_' &&
                                filename.charAt(1) !== '_'
                            ) {
                                return `.${filename.slice(1)}`;
                            }
                            if (
                                filename.charAt(0) === '_' &&
                                filename.charAt(1) === '_'
                            ) {
                                return `${filename.slice(1)}`;
                            }
                            return filename;
                        })
                        .join('/');
                    const sourcePath = path.resolve(source, rawPath);
                    const content = renderFile(sourcePath, data, ejsOptions);
                    // only set file if it's not all whitespace, or is a Buffer (binary files)
                    if (Buffer.isBuffer(content) || /[^\s]/.test(content)) {
                        files[targetPath] = content;
                    }
                }
            });
        } else if (isObject(source)) {
            this._injectFileMiddleware(files => {
                const data = this._resolveData(additionalData);
                for (const targetPath in source) {
                    const sourcePath = path.resolve(
                        baseDir,
                        source[targetPath]
                    );
                    const content = renderFile(sourcePath, data, ejsOptions);
                    if (Buffer.isBuffer(content) || content.trim()) {
                        files[targetPath] = content;
                    }
                }
            });
        } else if (isFunction(source)) {
            this._injectFileMiddleware(source);
        }
    }

    /**
     * Inject a file processing middleware.
     *
     * @private
     * @param {FileMiddleware} middleware - A middleware function that receives the
     *   virtual files tree object, and an ejs render function. Can be async.
     */
    _injectFileMiddleware(middleware) {
        this.projectGenerator.fileMiddlewares.push(middleware);
    }

    /**
     * Resolves the data when rendering templates.
     *
     * @private
     */
    _resolveData(additionalData) {
        return Object.assign(
            {
                options: this.options,
                rootOptions: this.rootOptions,
                plugins: this.pluginsData
            },
            additionalData
        );
    }
}

module.exports = ProjectGeneratorApi;
