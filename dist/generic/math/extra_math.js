export function trueMod(n, m) {
    return ((n % m) + m) % m;
}
export function factorial(n) {
    let acc = 1;
    for (let i = 2; i < n; ++i) {
        acc *= i;
    }
    return acc;
}
export function nChooseK(n, k) {
    return factorial(n) / (factorial(k) * factorial(n - k));
}
