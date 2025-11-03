import { Strategy } from 'passport-twitter';
declare const TwitterStrategy_base: new (...args: [options: import("passport-twitter").IStrategyOptionWithRequest] | [options: import("passport-twitter").IStrategyOption]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class TwitterStrategy extends TwitterStrategy_base {
    constructor();
    validate(token: string, tokenSecret: string, profile: any, done: Function): Promise<void>;
}
export {};
