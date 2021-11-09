let keyStates = {};
function onKeyDown(event) {
    keyStates[event.code] = true;
}
function onKeyUp(event) {
    keyStates[event.code] = false;
}
document.addEventListener('keydown', onKeyDown, false);
document.addEventListener('keyup', onKeyUp, false);
export function isKeyDown(keyCode) {
    if (keyStates[keyCode] === undefined) {
        return false;
    }
    return keyStates[keyCode];
}
