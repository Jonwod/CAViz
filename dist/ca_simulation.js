export class CASimulation {
    constructor(ca, initialConfiguration, width, height) {
        const worldSize = initialConfiguration.getSize();
        this.worldSize = worldSize;
        let div = document.createElement("div");
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
}
