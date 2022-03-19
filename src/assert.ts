/**
 * If the condition is false, this will throw an error and produce an alert window.
 * @param condition If this evaluates to false, assert fails
 * @param errorMessage Custom message to be presented on assert failure
 */
export function assert(condition: boolean, errorMessage?: string) {
    if(!condition) {
        alert("Assertation failed: " + errorMessage);
        throw new Error(errorMessage);
    }
}