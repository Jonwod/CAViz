/** ==============================
 * Automated tests of the codebase
   =============================== */
import { factorial, nChooseK, trueMod } from "./generic/math/extra_math.js";

/*
* I chose to make a separate assert function to the one in assert.ts
* in order that it could be enabled/disabled independently.
*/
function assert(condition: boolean, errorMessage?: string) {
    if(!condition) {
        alert("Assertation failed: " + ((typeof(errorMessage) != "undefined") ? errorMessage : ""));
        throw new Error(errorMessage);
    }
}


export function runAllTests() {
    assert(factorial(1) === 1, `factorial(1) = ${factorial(1)}`);
    assert(factorial(2) === 2, `factorial(2) = ${factorial(2)}`);
    assert(factorial(6) === 720,`factorial(6) = ${factorial(6)}`);

    assert(nChooseK(1, 1) === 1, `nChooseK(1, 1)  = ${nChooseK(1, 1) }`);
    assert(nChooseK(10, 4) === 210, `nChooseK(1, 1)  = ${nChooseK(10, 4)}`);

    assert(trueMod(7, 5) === 2, `trueMod(7, 5) = ${trueMod(7, 5)}`);
    assert(trueMod(-7, 5) === 3, `trueMod(-7, 5) = ${trueMod(-7, 5)}`);
}

