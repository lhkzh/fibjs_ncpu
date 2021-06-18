# fibjs_ncpu

# Installation
```sh
npm install fibjs_ncpu
```

`require:fibjs version>=v0.30`


# Attention
方便把重度计算分散在其他线程

# Quick Start
```js
import {NCPU} from 'fibjs_ncpu' // or const {NCPU} = require('ncpu')
function main () {
  // ### run
    NCPU.run((a,b)=>a+b,[1,2]) // result: 3
    NCPU.run((list)=>{
        return list.reduce((total,value)=>{return total+value;});
    },[[1,2,3]]) // result: 6
    const workerFibo = NCPU.wrapAsync((num)=>{
        const fibo = (value)=>{
            if(value<=2){return 1;}
            return fibo(value-2)+fibo(value-1);
        }
        return fibo(num);
    });
    const res = await Promise.all([workerFibo(21), workerFibo(20)]);
  // ### mod
  NCPU.mod("encoding").msgpack.encode([2,3,5]);
  NCPU.mod("json").encode([2,3,5]);
}
main()
```