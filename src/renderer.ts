import { loadShader } from "./gl_helpers.js";
import { MeshTemplate } from "./mesh_template.js";
import { Camera } from "./camera.js";
declare var mat4: any;
export class Renderer {
    private rootElement: HTMLElement;
    private canvas: HTMLCanvasElement;
    private gl: WebGLRenderingContext;

    private meshTemplate: MeshTemplate;
    private camera: Camera;

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

        const fieldOfView = 45 * Math.PI / 180;   // in radians
        const aspect = this.gl.canvas.clientWidth / this.gl.canvas.clientHeight;
        console.log("aspect: " + aspect);
        const zNear = 0.1;
        const zFar = 1000.0;
        this.camera = new Camera(fieldOfView, aspect, zNear, zFar);
    }

    public getHTML(): HTMLElement {
        return this.rootElement;
    }


    private initBuffers() {
        // An array of positions for the cube.
        // Cube positions and indices are courtesy of
        // Mozilla: https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Creating_3D_objects_using_WebGL
        const positions = [
            // Front face
            -0.5, -0.5,  0.5,
             0.5, -0.5,  0.5,
             0.5,  0.5,  0.5,
            -0.5,  0.5,  0.5,
          
            // Back face
            -0.5, -0.5, -0.5,
            -0.5,  0.5, -0.5,
             0.5,  0.5, -0.5,
             0.5, -0.5, -0.5,
          
            // Top face
            -0.5,  0.5, -0.5,
            -0.5,  0.5,  0.5,
             0.5,  0.5,  0.5,
             0.5,  0.5, -0.5,
          
            // Bottom face
            -0.5, -0.5, -0.5,
             0.5, -0.5, -0.5,
             0.5, -0.5,  0.5,
            -0.5, -0.5,  0.5,
          
            // Right face
             0.5, -0.5, -0.5,
             0.5,  0.5, -0.5,
             0.5,  0.5,  0.5,
             0.5, -0.5,  0.5,
          
            // Left face
            -0.5, -0.5, -0.5,
            -0.5, -0.5,  0.5,
            -0.5,  0.5,  0.5,
            -0.5,  0.5, -0.5,
        ];
          
        const indices = [
            0,  1,  2,      0,  2,  3,    // front
            4,  5,  6,      4,  6,  7,    // back
            8,  9,  10,     8,  10, 11,   // top
            12, 13, 14,     12, 14, 15,   // bottom
            16, 17, 18,     16, 18, 19,   // right
            20, 21, 22,     20, 22, 23,   // left
        ];

        const vertexNormals = [
            // Front
             0.0,  0.0,  1.0,
             0.0,  0.0,  1.0,
             0.0,  0.0,  1.0,
             0.0,  0.0,  1.0,
        
            // Back
             0.0,  0.0, -1.0,
             0.0,  0.0, -1.0,
             0.0,  0.0, -1.0,
             0.0,  0.0, -1.0,
        
            // Top
             0.0,  1.0,  0.0,
             0.0,  1.0,  0.0,
             0.0,  1.0,  0.0,
             0.0,  1.0,  0.0,
        
            // Bottom
             0.0, -1.0,  0.0,
             0.0, -1.0,  0.0,
             0.0, -1.0,  0.0,
             0.0, -1.0,  0.0,
        
            // Right
             1.0,  0.0,  0.0,
             1.0,  0.0,  0.0,
             1.0,  0.0,  0.0,
             1.0,  0.0,  0.0,
        
            // Left
            -1.0,  0.0,  0.0,
            -1.0,  0.0,  0.0,
            -1.0,  0.0,  0.0,
            -1.0,  0.0,  0.0
        ];

        this.meshTemplate = new MeshTemplate(this.gl, positions, indices, vertexNormals);
    }

    public render() {
        const gl = this.gl;

        gl.clearDepth(1.0);                 // Clear everything
        gl.enable(gl.DEPTH_TEST);           // Enable depth testing
        gl.depthFunc(gl.LEQUAL);            // Near things obscure far things
      
        // Clear the canvas before we start drawing on it.
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        const aspect = this.gl.canvas.clientWidth / this.gl.canvas.clientHeight;

        // Allow for change in aspect ratio
        this.camera.setAspectRatio(aspect);

        for(let x = -5; x < 5; ++x) {
            for(let y = -5; y < 5; ++y) {
                const modelViewMatrix = mat4.create();
                const xRender = x;
                const yRender = y;
                const zRender = -10;
                mat4.translate(modelViewMatrix,     // destination matrix
                               modelViewMatrix,     // matrix to translate
                               [xRender, yRender, zRender]);  // amount to translate
                
                // Making the cube rotate
                const rads = Date.now()/1000;
                mat4.rotate(modelViewMatrix, 
                            modelViewMatrix, 
                            rads,
                            [0.1, 0.1, 0.1]);
                this.meshTemplate.render(modelViewMatrix, this.camera.getPerspectiveMatrix());
            }
        }
    }
}