import { Renderer } from "../dist/renderer.js";
let body = <HTMLBodyElement>document.getElementsByTagName("body")[0];
let renderer = new Renderer(500, 400);
body.appendChild(renderer.getHTML());

// hz
const updateRate = 30.0;
let lastUpdate;

function draw(timestamp) {
    if (lastUpdate === undefined)
        lastUpdate = timestamp;
    const elapsed = timestamp - lastUpdate;

    if ( (elapsed/1000.0) >= (1.0/updateRate) ) {        
        // Do the rendering here
        renderer.render();
        lastUpdate = timestamp;
    }

    window.requestAnimationFrame(draw);
}

window.requestAnimationFrame(draw);
