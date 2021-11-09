import { Renderer } from "../dist/renderer.js";
let body = document.getElementsByTagName("body")[0];
let renderer = new Renderer(500, 400);
body.appendChild(renderer.getHTML());
const updateRate = 60.0;
let lastUpdate;
function draw(timestamp) {
    if (lastUpdate === undefined)
        lastUpdate = timestamp;
    const elapsed = timestamp - lastUpdate;
    if ((elapsed / 1000.0) >= (1.0 / updateRate)) {
        renderer.render();
        lastUpdate = timestamp;
    }
    window.requestAnimationFrame(draw);
}
window.requestAnimationFrame(draw);
