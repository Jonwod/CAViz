export function vecAdd(a: number[], b: number[]): number[] {
    let result = [];
    for(let i = 0; i < a.length && i < b.length; ++i) {
        result.push(a[i] + b[i]);
    }
    return result;
}