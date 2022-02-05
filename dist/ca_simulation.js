export class CASimulation {
    constructor(ca, initialConfiguration, width, height) {
        const worldSize = initialConfiguration.getSize();
        this.worldSize = worldSize;
        let div = document.createElement("div");
        this.fpsCounter = document.createElement("p");
        div.appendChild(this.fpsCounter);
        this.canvas = document.createElement("canvas");
        this.canvas.width = width;
        this.canvas.height = height;
        this.gl = this.canvas.getContext("webgl2");
        if (this.gl === null) {
            alert("Unable to initialize WebGL. Your browser or machine may not support it.");
            return null;
        }
        this.gl.clearColor(0, 0, 0, 1);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        div.appendChild(this.canvas);
        this.rootElement = div;
    }
    getHTML() {
        return this.rootElement;
    }
    getCanvasWidth() {
        return this.canvas.width;
    }
    getCanvasHeight() {
        return this.canvas.height;
    }
    getFramerate() {
        return this.framerate;
    }
    run() {
        const drawRate = 60.0;
        const caUpdateRate = 60.0;
        let lastDrawStamp, lastCaUpdateStamp;
        let that = this;
        function tick(timestamp) {
            if (lastDrawStamp === undefined)
                lastDrawStamp = timestamp;
            if (lastCaUpdateStamp === undefined)
                lastCaUpdateStamp = timestamp;
            const timeSinceDraw = timestamp - lastDrawStamp;
            if ((timeSinceDraw / 1000.0) >= (1.0 / drawRate)) {
                that.draw();
                lastDrawStamp = timestamp;
                that.framerate = (1.0 / timeSinceDraw) * 1000;
                that.fpsCounter.innerHTML = that.framerate.toFixed(2).toString();
            }
            const timeSinceCaUpdate = timestamp - lastCaUpdateStamp;
            if ((timeSinceCaUpdate / 1000.0) >= (1.0 / caUpdateRate)) {
                that.update();
                lastCaUpdateStamp = timestamp;
            }
            window.requestAnimationFrame(tick);
        }
        window.requestAnimationFrame(tick);
    }
}
