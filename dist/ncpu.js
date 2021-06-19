"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NCPU = void 0;
/// <reference types="@fibjs/types" />
const coroutine = require("coroutine");
const path = require("path");
const util = require("util");
const os = require("os");
/**
 * 新建一个worker（同步方式，需要等待其onload/onerror）
 * @param path
 * @param onMsg
 */
function newWorker(filePath, onMsg) {
    let w = new coroutine.Worker(filePath);
    let evt = new coroutine.Event();
    let err = null;
    w.once({
        load: () => {
            w.off("error");
            onMsg && (w.onmessage = e => {
                onMsg(e.data);
            });
            evt.set();
        },
        error: e => {
            w.off("load");
            err = new Error(`${e.type}:${path},${e.reason}`);
            evt.set();
        }
    });
    evt.wait();
    if (err) {
        throw err;
    }
    return w;
}
/**
 * 启用的woker数量
 */
const workerNum = Math.max(1, os.cpuNumbers());
let _workerS = [];
let _workerI = 0;
let _reqS = {};
function post_to_worker(fnStr, args = [], i) {
    let rid = _workerI++;
    (_workerS[i] || _workerS[rid % _workerS.length]).postMessage({ fn: fnStr, args: args, rid: rid });
    return rid;
}
function runInWorkerSync(fnStr, args = [], i) {
    let rid = post_to_worker(fnStr, args, i);
    let evt = new coroutine.Event();
    _reqS[rid] = evt;
    evt.wait();
    if (evt["err"]) {
        throw evt["err"];
    }
    return evt["rsp"];
}
function runInWorkerAsync(fnStr, args = [], i) {
    return new Promise((suc, fail) => {
        let rid = post_to_worker(fnStr, args, i);
        let evt = { set: () => {
                if (evt["err"]) {
                    fail(evt["err"]);
                }
                else {
                    suc(evt["rsp"]);
                }
            } };
        _reqS[rid] = evt;
    });
}
function run_require(fPath) {
    _workerS.forEach(w => {
        runInWorkerSync("require", [fPath]);
    });
}
function run_set(pStr, v) {
    _workerS.forEach(w => {
        w.postMessage({ k: pStr, v: v });
    });
}
function _wrap_fn(moduleId, fnName) {
    return (...args) => {
        return runInWorkerSync(`${moduleId}.${fnName}`, args);
    };
}
function _wrap_proxy(mname, mod) {
    let base = {};
    for (var k in mod) {
        if (util.isFunction(mod[k])) {
            base[k] = _wrap_fn(mname, k);
        }
        else if (util.isObject(mod[k])) {
            base[k] = _wrap_proxy(`${mname}.${k}`, mod[k]);
        }
        else {
            base[k] = mod[k];
        }
    }
    let p = new Proxy(base, {
        apply: function (target, that, args) {
            return base.apply(that, args);
        },
        set: function (obj, pKey, value) {
            obj[pKey] = value;
            run_set(`${mname}.${pKey.toString()}`, value);
            return true;
        }
    });
    return p;
}
let _mods = {};
class NCPU {
    /**
     * 启用的woker数量
     */
    static get workerNum() {
        return workerNum;
    }
    /**
     * 在子worker载入模块，并返回执行代理
     * @param id
     */
    static mod(id) {
        if (_mods[id]) {
            return _mods[id];
        }
        let _path = id;
        if (_path.includes(".")) {
            _path = path.resolve(_path);
        }
        run_require(_path);
        let mname = _mod_name(_path);
        let mod = require(_path);
        let p = _wrap_proxy(mname, mod);
        _mods[id] = p;
        return p;
    }
    /**
     * 在worker中执行方法并返回结果
     * @param fnStr
     * @param args
     */
    static run(fnStr, args = [], atWorkerIndex) {
        return runInWorkerSync(fnStr.toString(), args, atWorkerIndex);
    }
    /**
     * 在worker中执行方法并返回结果
     * @param fnStr
     * @param args
     */
    static runAsync(fnStr, args = [], atWorkerIndex) {
        return runInWorkerAsync(fnStr.toString(), args, atWorkerIndex);
    }
    static wrap(fnStr) {
        return ((...params) => {
            return run(fnStr.toString(), params);
        });
    }
    static wrapAsync(fnStr) {
        return async (...params) => {
            return await this.runAsync(fnStr.toString(), params);
        };
    }
    /**
     * 新建一个worker（同步方式，需要等待其onload/onerror）
     * @param path
     * @param onMsg
     */
    static newWorker(filePath, onMsg) {
        return newWorker(filePath, onMsg);
    }
}
exports.NCPU = NCPU;
function _mod_name(file_path) {
    return path.basename(file_path).replace(path.extname(file_path), "");
}
if (typeof (Master) == 'undefined') {
    function load_self_worker(i) {
        let worker = newWorker(__filename, d => {
            if (_reqS[d.rid]) {
                let evt = _reqS[d.rid];
                delete _reqS[d.rid];
                evt['rsp'] = d.rsp;
                evt['err'] = d.err;
                evt.set();
            }
        });
        worker["i"] = i;
        return worker;
    }
    for (var i = 0; i < workerNum; i++) {
        _workerS.push(load_self_worker(i));
    }
}
else {
    let c_mods = {};
    let c_fnReg = /[(=]/;
    function get_deep_fn(method) {
        if (c_fnReg.test(method)) {
            return new Function(`return (${method})(...arguments);`);
        }
        let arr = method.split(".");
        let fn = c_mods[arr[0]] || global[arr[0]];
        for (let i = 1; i < arr.length; i++) {
            fn = fn[arr[i]];
        }
        return fn;
    }
    Master.onmessage = e => {
        let data = e.data;
        let args = data.args;
        delete data.args;
        if (data.k) {
            let arr = data.k.split(".");
            if (arr.length == 2) {
                c_mods[arr[0]][arr[1]] = data.v;
            }
            else if (arr.length == 3) {
                c_mods[arr[0]][arr[1]][arr[2]] = data.v;
            }
            else if (arr.length == 4) {
                c_mods[arr[0]][arr[1]][arr[2]][arr[3]] = data.v;
            }
            else if (arr.length == 5) {
                c_mods[arr[0]][arr[1]][arr[2]][arr[3]][arr[4]] = data.v;
            }
        }
        else {
            try {
                if (data.fn == "require") {
                    let file_path = args[0];
                    let mod_name = _mod_name(file_path);
                    c_mods[mod_name] = require(file_path);
                    if (!global[mod_name]) {
                        global[mod_name] = c_mods[mod_name];
                    }
                }
                else {
                    data.rsp = get_deep_fn(data.fn)(...args);
                }
            }
            catch (e) {
                data.err = `${e},${data.fn}_${JSON.stringify(args)}`;
            }
        }
        Master.postMessage(data);
    };
}
