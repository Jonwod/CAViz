import { loadShader } from "./gl_helpers.js";
import { MeshTemplate } from "./mesh_template.js";
declare var mat4: any;
export class Renderer {
    private rootElement: HTMLElement;
    private canvas: HTMLCanvasElement;
    private gl: WebGLRenderingContext;

    private meshTemplate: MeshTemplate;

    constructor(width: number, height: number) {
        let div = document.createElement("div");
        this.canvas = document.createElement("canvas");
        this.canvas.width = 800;
        this.canvas.height = 800;
        this.gl = this.canvas.getContext("webgl");
        if(this.gl === null) {
            alert("Unable to initialize WebGL. Your browser or machine may not support it.");
            return null;
        }

        this.gl.clearColor(0,0,0,1);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        this.initBuffers();

        div.appendChild(this.canvas);

        this.rootElement = div;
    }

    public getHTML(): HTMLElement {
        return this.rootElement;
    }


    private initBuffers() {
        // An array of positions for the cube.
        const positions = [
            // Front square
          -0.5,  0.5, 0.5, // top-left
           0.5,  0.5, 0.5, // top-right
          -0.5, -0.5, 0.5, // bottom-left
           0.5, -0.5, 0.5, // bottom-right
           // Back square
          -0.5,  0.5, -0.5, // top-left
           0.5,  0.5, -0.5, // top-right
          -0.5, -0.5, -0.5, // bottom-left
           0.5, -0.5, -0.5, // bottom-right
        ];
        // An array of indices specifying the triangles
        const indices = [
            // Front
            0, 1, 2,
            1, 2, 3,
            // Bottom
            2, 3, 6,
            3, 6, 7,
            // Top
            0, 1, 4,
            1, 4, 5,
            // Back
            6, 7, 4,
            4, 5, 7,
            // Left
            0, 2, 6,
            0, 4, 6,
            // Right
            1, 3, 7,
            1, 5, 7
        ];

        this.meshTemplate = new MeshTemplate(this.gl, positions, indices);
    }

    public render() {
        const gl = this.gl;

        gl.clearDepth(1.0);                 // Clear everything
        gl.enable(gl.DEPTH_TEST);           // Enable depth testing
        gl.depthFunc(gl.LEQUAL);            // Near things obscure far things
      
        // Clear the canvas before we start drawing on it.
      
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        this.meshTemplate.render();
    }
}