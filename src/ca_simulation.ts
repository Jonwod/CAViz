import { CellularAutomaton } from "./cellular_automaton.js";
import { Configuration } from "./configuration";

/**
 * A simulation of a particular Cellular Automaton, from the given start
 * configuration. Will automatically implement it to run on the GPU, if
 * possible.
 */
export abstract class CASimulation {
    protected rootElement: HTMLElement;
    protected canvas: HTMLCanvasElement;
    protected gl: WebGL2RenderingContext;
    protected worldSize: number;
    private framerate: number;
    private fpsCounter: HTMLParagraphElement;

    constructor(ca: CellularAutomaton, initialConfiguration: Configuration, width: number, height: number) {
        const worldSize = initialConfiguration.getSize();
        this.worldSize = worldSize;
        
        let div = document.createElement("div");
        this.fpsCounter = document.createElement("p");

        div.appendChild(this.fpsCounter);

        this.canvas = document.createElement("canvas");
        this.canvas.width = width;
        this.canvas.height = height;
        this.gl = this.canvas.getContext("webgl2");
        if(this.gl === null) {
            alert("Unable to initialize WebGL. Your browser or machine may not support it.");
            return null;
        }

        this.gl.clearColor(0,0,0,1);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        div.appendChild(this.canvas);

        this.rootElement = div;
    }

    public getHTML(): HTMLElement {
        return this.rootElement;
    }

    public getCanvasWidth(): number {
        return this.canvas.width;
    }

    public getCanvasHeight(): number {
        return this.canvas.height;
    }

    public getFramerate(): number {
        return this.framerate;
    }

    /**
     * Will run indefinitely in it's own loop, updating the canvas
     * This function should be non-blocking
     */
    public run(): void {
        // hz
        const drawRate = 60.0;
        const caUpdateRate = 60.0;
        let lastDrawStamp, lastCaUpdateStamp;
        let that = this;

        function tick(timestamp) {
            if (lastDrawStamp === undefined)
                lastDrawStamp = timestamp;
            if(lastCaUpdateStamp === undefined)
                lastCaUpdateStamp = timestamp;
            const timeSinceDraw = timestamp - lastDrawStamp;

            if ( (timeSinceDraw/1000.0) >= (1.0/drawRate) ) {        
                that.draw();
                lastDrawStamp = timestamp;
                that.framerate = (1.0 / timeSinceDraw) * 1000;
                that.fpsCounter.innerHTML = that.framerate.toString();
            }

            const timeSinceCaUpdate = timestamp - lastCaUpdateStamp;
            if( (timeSinceCaUpdate/1000.0) >= (1.0/caUpdateRate) ) {
                that.update();
                lastCaUpdateStamp = timestamp;
            }

            window.requestAnimationFrame(tick);
        }
        window.requestAnimationFrame(tick);
    }


    protected abstract update(): void;
    protected abstract draw(): void;
}