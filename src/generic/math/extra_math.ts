export function trueMod(n, m): number {
  // Taken from https://stackoverflow.com/questions/4467539/javascript-modulo-gives-a-negative-result-for-negative-numbers
  return ((n % m) + m) % m;
}


export function factorial(n: number): number {
  let acc = 1;
  for(let i = 2; i <= n; ++i) {
    acc *= i;
  }
  return acc;
}


export function nChooseK(n: number, k: number): number {
  return factorial(n) / (factorial(k) * factorial(n-k));
}
