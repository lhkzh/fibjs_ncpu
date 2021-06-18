/// <reference types="@fibjs/types" />
export declare class NCPU {
    /**
     * 启用的woker数量
     */
    static get workerNum(): number;
    /**
     * 在子worker载入模块，并返回执行代理
     * @param id
     */
    static mod<T>(id: string): any;
    /**
     * 在worker中执行方法并返回结果
     * @param fnStr
     * @param args
     */
    static run(fnStr: string | Function, args?: Array<any>, atWorkerIndex?: number): any;
    /**
     * 在worker中执行方法并返回结果
     * @param fnStr
     * @param args
     */
    static runAsync(fnStr: string | Function, args?: Array<any>, atWorkerIndex?: number): Promise<unknown>;
    static wrap<T extends Function>(fnStr: string | Function): T;
    static wrapAsync(fnStr: string | Function): (...params: any[]) => Promise<unknown>;
    /**
     * 新建一个worker（同步方式，需要等待其onload/onerror）
     * @param path
     * @param onMsg
     */
    static newWorker(filePath: string, onMsg?: (data: any) => void): Class_Worker;
}
