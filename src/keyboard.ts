

let keyStates = {};

function onKeyDown(event: KeyboardEvent) {
    keyStates[event.code] = true;
}

function onKeyUp(event: KeyboardEvent) {
    keyStates[event.code] = false;
}


document.addEventListener('keydown', onKeyDown, false);
document.addEventListener('keyup', onKeyUp, false);

export function isKeyDown(keyCode: string): boolean {
    if(keyStates[keyCode] === undefined) {
        return false;
    }
    return keyStates[keyCode];
}
