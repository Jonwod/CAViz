import { CellularAutomaton } from "./cellular_automaton.js";
import { Configuration } from "./configuration";

/**
 * A simulation of a particular Cellular Automaton, from the given start
 * configuration. Will automatically implement it to run on the GPU, if
 * possible.
 */
export abstract class CASimulation {
    private rootElement: HTMLElement;
    protected canvas: HTMLCanvasElement;
    protected gl: WebGL2RenderingContext;
    protected worldSize: number;

    constructor(ca: CellularAutomaton, initialConfiguration: Configuration, width: number, height: number) {
        const worldSize = initialConfiguration.getSize();
        this.worldSize = worldSize;
        
        let div = document.createElement("div");
        this.canvas = document.createElement("canvas");
        this.canvas.width = width;
        this.canvas.height = height;
        this.gl = this.canvas.getContext("webgl2"); // NOTE WebGL 2. Make sure this works.
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

    /**
     * Will run indefinitely in it's own loop, updating the canvas
     * This function should be non-blocking
     */
    public abstract run(): void;
}