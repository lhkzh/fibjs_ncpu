const assert = require("assert");
const test = require("test");
const util = require("util");
const msgpack = require("msgpack");
const json = require("json");
test.setup();
const coroutine = require("coroutine");
const NCPU = require("../dist/ncpu").NCPU;
describe("fibjs_ncpu", () => {
    it("dyn_fn1", ()=>{
        var rsp = NCPU.run(function(a,b){return a*b;}, [2,3]);
        assert.isNumber(rsp);
        assert.isTrue(rsp==6);
    });
    it("dyn_fn2", ()=>{
        var rsp = NCPU.run((a,b)=>a*b, [2,3]);
        assert.isNumber(rsp);
        assert.isTrue(rsp==6);
        var rsp = NCPU.run(a=>a*2,[4]);
        assert.isTrue(rsp==8);
    });
    it("dyn_fn4", async ()=>{
       let fn = NCPU.wrapAsync((a,b)=>a*b);
       let rsp = await fn(2,4);
        assert.isTrue(rsp==8);
    });

    var obj = {a:2,b:3,c:[2,3,5,33.25,"hi"],d:true,e:false};
    it("model_json", ()=>{
        assert.isTrue(NCPU.mod("json").encode(obj)==require("json").encode(obj));
    });
    it("model_msgpack", ()=>{
        var rsp = NCPU.mod("msgpack").encode(obj);
        assert.isTrue(rsp.equals(require("msgpack").encode(obj)));
    });
});


process.exit(test.run(console.DEBUG));