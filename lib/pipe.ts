// Credit: https://medium.com/ackee/typescript-function-composition-and-recurrent-types-a9efbc8e7736
// https://github.com/AckeeCZ/desmond/blob/v0.4.0/src/lib/pipe.ts

type ArgTypes<T> = T extends (...args: infer A) => any ? A : never;
type ArgType<F, Else= never> = F extends (arg: infer A) => any ? A : Else;
type ReplaceReturnTypePromise<T, TNewReturn> = (...a: ArgTypes<T>) => Promise<TNewReturn>;
type VariadicFunction = (...args: any[]) => any;
type Lookup<T, K, Default= never> = K extends keyof T ? T[K] : Default;
type Tail<T extends any[]> = ((...t: T) => void) extends ((x: any, ...u: infer U) => void) ? U : never;
type UnpackPromise<T> = T extends Promise<Array<infer U>> ? U[] : T extends Promise<infer D> ? D : T;
type LastIndexOf<T extends any[]> =
  ((...x: T) => void) extends ((y: any, ...z: infer U) => void)
  ? U['length'] : never;
type RiverFn = (arg: any) => any;
type AsChain<F extends [RiverFn, ...RiverFn[]], G extends RiverFn[]= Tail<F>> = {
    [K in keyof F]: (arg: UnpackPromise<ArgType<F[K]>>) => ArgType<Lookup<G, K, any>, any>
};
function pipe<T>(): (arg: T) => Promise<T>;
function pipe<Delta extends VariadicFunction>(df: Delta): Delta;
function pipe<
    Delta extends VariadicFunction,
    F extends [(arg: UnpackPromise<ReturnType<Delta>>) => any, ...Array<(arg: any) => any>]
>(df: Delta, ...rivers: F & AsChain<F>):
    ReplaceReturnTypePromise<Delta, ReturnType<F[LastIndexOf<F>]>>;

/**
 * Create a function composed of provided functions in left-to-right execution chain.
 * Resulting function arguments are identical to the arguments of the first function
 * and return value identical to the result value of the last function in the chain.
 * ```typescript
 * const myPipe = pipe(
 *     (x: string) => x + 'first ',
 *     (x: string) => x + 'second',
 * );
 * await myPipe('Called: ') // 'Called: first second'
 * ```
 * First function can have multiple arguments:
 * ```typescript
 * await pipe(
 *     (a: number, b: number) => a + b,
 *     String,
 * )(1, 2); // '3'
 * ```
 * In-between the steps, all result promises are resolved. If result is an array, elements are resolved via Promise.all
 * ```typescript
 * await pipe(
 *     // first function has 0 args, resulting pipe has 0 args
 *     // any function can return promise, next function receives value as arg
 *     () => Promise.resolve([1, 2, 5, 8])
 *     // returning array of promises
 *     // no need to wrap in promise resolved
 *     (ids: number[]) => ids.map(db.find),
 *     // resolved array of users ready in next function
 *     (users: User[]), => users.map(countUserRating),
 * )(); // userRating[]
 * ```
 * @return Function with signature of the first function (or no args if no functions provided) returning Promise of a result of last function
 */
function pipe(...fns: any[]): any {
    return (...initialArgs: any[]) =>
        fns.reduce((pendingLastResult, fn, i) => pendingLastResult.then((lastResult: any) => {
            // first iteration (lastResult is initialArgs), spread into delta function
            const currentResult = i === 0 ? fn(...lastResult) : fn(lastResult);
            return Array.isArray(currentResult) ? Promise.all(currentResult) : currentResult;
        }), Promise.all(initialArgs));
}

export default pipe;

const add = (x: number) => (y: number) => x + y
const string = (x: any) => String(x)

async function test() {
    let b = await pipe(
        add(2),
        add(3),
        string,
    )(1)
    console.log(b)
}

test()