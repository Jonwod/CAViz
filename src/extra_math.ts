export function trueMod(n, m) {
    // Taken from https://stackoverflow.com/questions/4467539/javascript-modulo-gives-a-negative-result-for-negative-numbers
    return ((n % m) + m) % m;
  }