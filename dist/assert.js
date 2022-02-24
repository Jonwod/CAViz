export function assert(condition, errorMessage) {
    if (!condition) {
        alert("Assertation failed: " + errorMessage);
        throw new Error(errorMessage);
    }
}
