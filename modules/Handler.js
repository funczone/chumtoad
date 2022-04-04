/* eslint-disable no-unused-vars */
const BaseConstruct = require("./BaseConstruct");
const Response = require("./Response");
const log = require("./log");
const _ = require("lodash");
const path = require("path");
const filehound = require("filehound");

/**
 * Handler framework
 */
class Handler {
    constructor() {
        throw new Error(`The ${this.constructor.name} class cannot be instantiated.`);
    }

    /**
     * @param {string} filePath
     */
    static resolvePath(filePath) {
        if (!filePath) return new Response({ message: "Required parameters weren't supplied", success: false });
        const obj = {};
        try {
            obj.value = require.resolve(filePath);
        } catch (error) {
            obj.error = error;
            obj.success = false;
            if (error.code === "MODULE_NOT_FOUND") {
                obj.message = `Path "${filePath}" couldn't be resolved, module not found`;
                log.warn("[resolvePath]", obj.message, error);
            } else {
                obj.message = "Error while resolving file path";
                log.error("[resolvePath]", error);
            }
        }
        if (_.has(obj, "value") && _.isString(obj.value)) {
            obj.success = true;
            obj.message = "Path successfully resolved";
        } else if (!_.has(obj, "error")) {
            obj.success = false;
            obj.message = "Something went wrong while resolving path, but didn't result in an error";
        }
        return new Response(obj);
    }

    /**
     * @param {BaseConstruct} construct
     * @param {?string} [filePath=null]
     */
    static unloadModule(construct, filePath = null) {
        if (!construct) return new Response({ message: "Required parameters weren't supplied", success: false });
        if (construct instanceof BaseConstruct === false) return new Response({ message: "Construct provided wasn't a construct", success: false });
        let target = null, cache = false, blocks = false, ids = [];
        if (filePath) {
            const resolvedPath = Handler.resolvePath(filePath);
            if (resolvedPath.success && !resolvedPath.error) {
                target = resolvedPath.value;
                if (_.has(require.cache, target)) {
                    delete require.cache[target];
                    cache = true;
                }
            } else {
                return resolvedPath;
            }
        }
        if (construct.idsByPath.has(target)) {
            ids = construct.idsByPath.get(target);
            for (const id of ids) {
                if (!construct.cache.has(id)) continue;
                construct.unload(construct.cache.get(id));
            }
            blocks = true;
        }
        const obj = { success: true };
        if (blocks || cache) {
            obj.message = `Unloaded ${cache ? `"${target}" from the cache` : ""}${cache && blocks ? " and " : ""}${blocks ? (target ? `${ids.length} ${ids.length === 1 ? "block" : "blocks"} mapped to that path` : "all anonymous blocks") : ""} from the ${construct.name}`;
        } else {
            obj.message = `Didn't unload anything as "${target}" wasn't cached nor mapped to any blocks`;
        }
        return new Response(obj);
    }

    /**
     * @param {BaseConstruct} construct
     * @param {[string]} filePaths
     * @param {?string} [directoryPath=null]
     */
    static unloadMultipleModules(construct, filePaths, directoryPath = null) {
        if (!construct || !filePaths) return new Response({ message: "Required parameters weren't supplied", success: false });
        if (!filePaths.length) return new Response({ message: `Unloaded 0/0 modules (No modules to unload, skipped)`, success: true });
        let successes = 0;
        for (const filePath of filePaths) {
            const result = Handler.unloadModule(construct, filePath);
            if (result.success && !result.error) ++successes;
        }
        return new Response({ message: `Unloaded ${successes}/${filePaths.length} modules${directoryPath ? ` in "${directoryPath}"` : ""}`, success: true });
    }

    /**
     * @param {BaseConstruct} construct
     * @param {(*|[*])} mod
     * @param {?string} [filePath=null]
     */
    static loadModule(construct, mod, filePath = null) {
        if (!construct || !mod) return new Response({ message: "Required parameters weren't supplied", success: false });
        if (construct instanceof BaseConstruct === false) return new Response({ message: "Construct provided wasn't a construct", success: false });
        if (_.isArray(mod)) {
            for (const block of mod) {
                construct.load(block, filePath);
            }
            return new Response({ message: `Loaded ${mod.length} ${mod.length === 1 ? "block" : "blocks"} from ${!filePath ? "code anonymously" : filePath}`, success: true });
        } else {
            construct.load(mod, filePath);
            return new Response({ message: `Loaded 1 block from ${!filePath ? "code anonymously" : `"${filePath}"`}`, success: true });
        }
    }

    /**
     * @param {BaseConstruct} construct
     * @param {string} filePath
     */
    static requireModule(construct, filePath) {
        if (!construct || !filePath) return new Response({ message: "Required parameters weren't supplied", success: false });
        if (construct instanceof BaseConstruct === false) return new Response({ message: "Construct provided wasn't a construct", success: false });
        let target;
        const resolvedPath = Handler.resolvePath(filePath);
        if (resolvedPath.success && !resolvedPath.error) {
            target = resolvedPath.value;
        } else {
            return resolvedPath;
        }
        let mod;
        try {
            mod = require(target);
        } catch (error) {
            log.error("[requireModule]", error);
            return new Response({ message: "Error while requiring module", success: false, error: error });
        }
        if (_.isNil(mod)) return new Response({ message: `Something went wrong while requiring module "${target}" but didn't result in an error`, success: false });
        return Handler.loadModule(construct, mod, target);
    }

    /**
     * @param {BaseConstruct} construct
     * @param {[string]} filePaths
     * @param {?string} [directoryPath=null]
     */
    static requireMultipleModules(construct, filePaths, directoryPath = null) {
        if (!construct || !filePaths) return new Response({ message: "Required parameters weren't supplied", success: false });
        if (!filePaths.length) return new Response({ message: `Loaded 0/0 modules (No modules to require, skipped)`, success: true });
        let successes = 0;
        for (const filePath of filePaths) {
            const result = Handler.requireModule(construct, filePath);
            if (result.success && !result.error) ++successes;
        }
        return new Response({ message: `Loaded ${successes}/${filePaths.length} modules${directoryPath ? ` in "${directoryPath}"` : ""}`, success: true });
    }

    /**
     * @param {BaseConstruct} construct
     * @param {string} directoryPath
     */
    static async requireDirectory(construct, directoryPath) {
        if (!construct || !directoryPath) return new Response({ message: "Required parameters weren't supplied", success: false });
        if (construct instanceof BaseConstruct === false) return new Response({ message: "Construct provided wasn't a construct", success: false });
        let filePaths;
        try {
            filePaths = await filehound.create().paths(directoryPath).ext(".js").find();
        } catch (error) {
            log.error(error);
            return new Response({ message: "Error while attempting to scan directory", success: false, error: error });
        }
        if (_.isNil(filePaths)) return new Response({ message: "Something went wrong while scanning directory but didn't result in an error", success: false });
        if (!filePaths.length) return new Response({ message: `Nothing to load in "${directoryPath}", skipping`, success: true });
        filePaths = filePaths.map(filePath => path.join("../", filePath));
        return Handler.requireMultipleModules(construct, filePaths, directoryPath);
    }
}

module.exports = Handler;
