export function assert(condition: boolean, errorMessage?: string) {
    if(!condition) {
        alert("Assertation failed: " + errorMessage);
        throw new Error(errorMessage);
    }
}