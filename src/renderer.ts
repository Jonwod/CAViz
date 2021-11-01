import { loadShader } from "./gl_helpers.js";
declare var mat4: any;


export class Renderer {
    private rootElement: HTMLElement;
    private canvas: HTMLCanvasElement;
    private gl: WebGLRenderingContext;
    private programInfo: {
        program: WebGLProgram;
        attribLocations: {
            vertexPosition: number;
        };
        uniformLocations: {
            projectionMatrix: WebGLUniformLocation;
            modelViewMatrix: WebGLUniformLocation;
        },
        vertexShaderSource: String;
        fragmentShaderSource: String;
    };
    private buffers: {
        position;
        positionCount: number;
        index;
        indexCount: number;
    };

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

        this.programInfo = {
            program: null,
            attribLocations: null,
            uniformLocations: null,
            vertexShaderSource: `
                attribute vec4 aVertexPosition;
            
                uniform mat4 uModelViewMatrix;
                uniform mat4 uProjectionMatrix;
            
                void main() {
                    gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
                }
           `,
            fragmentShaderSource: `
                void main() {
                    gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
                }
           `,
        };

        this.programInfo.program = this.initShaderProgram();
        this.programInfo.attribLocations = {
            vertexPosition: this.gl.getAttribLocation(this.programInfo.program, 'aVertexPosition'),
        },
        this.programInfo.uniformLocations = {
        projectionMatrix: this.gl.getUniformLocation(this.programInfo.program, 'uProjectionMatrix'),
        modelViewMatrix: this.gl.getUniformLocation(this.programInfo.program, 'uModelViewMatrix'),
        },

        this.buffers = this.initBuffers();

        div.appendChild(this.canvas);

        this.rootElement = div;
    }

    public getHTML(): HTMLElement {
        return this.rootElement;
    }

    private initShaderProgram() {
        const vertexShader = loadShader(this.gl, this.gl.VERTEX_SHADER, this.programInfo.vertexShaderSource);
        const fragmentShader = loadShader(this.gl, this.gl.FRAGMENT_SHADER, this.programInfo.fragmentShaderSource);
      
        // Create the shader program
      
        const shaderProgram = this.gl.createProgram();
        this.gl.attachShader(shaderProgram, vertexShader);
        this.gl.attachShader(shaderProgram, fragmentShader);
        this.gl.linkProgram(shaderProgram);
      
        // If creating the shader program failed, alert
      
        if (!this.gl.getProgramParameter(shaderProgram, this.gl.LINK_STATUS)) {
          alert('Unable to initialize the shader program: ' + this.gl.getProgramInfoLog(shaderProgram));
          return null;
        }
      
        return shaderProgram;
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
      
        const positionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER,
                      new Float32Array(positions),
                      this.gl.STATIC_DRAW);
      
        const indexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        this.gl.bufferData(
            this.gl.ELEMENT_ARRAY_BUFFER,
            new Uint16Array(indices),
            this.gl.STATIC_DRAW
        );

        return {
            position: positionBuffer,
            positionCount: positions.length,
            index: indexBuffer,
            indexCount: indices.length
        };
    }

    public render() {
        const gl = this.gl;
        const programInfo = this.programInfo;
        const buffers = this.buffers;
        gl.clearDepth(1.0);                 // Clear everything
        gl.enable(gl.DEPTH_TEST);           // Enable depth testing
        gl.depthFunc(gl.LEQUAL);            // Near things obscure far things
      
        // Clear the canvas before we start drawing on it.
      
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      
        // Create a perspective matrix, a special matrix that is
        // used to simulate the distortion of perspective in a camera.
        // Our field of view is 45 degrees, with a width/height
        // ratio that matches the display size of the canvas
        // and we only want to see objects between 0.1 units
        // and 100 units away from the camera.
      
        const fieldOfView = 45 * Math.PI / 180;   // in radians
        const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        const zNear = 0.1;
        const zFar = 1000.0;
        const projectionMatrix = mat4.create();
      
        // note: glmatrix.js always has the first argument
        // as the destination to receive the result.
        mat4.perspective(projectionMatrix,
                         fieldOfView,
                         aspect,
                         zNear,
                         zFar);
      
        // Tell WebGL how to pull out the positions from the position
        // buffer into the vertexPosition attribute.
        {
          const numComponents = 3;  // pull out 2 values per iteration
          const type = gl.FLOAT;    // the data in the buffer is 32bit floats
          const normalize = false;  // don't normalize
          const stride = 0;         // how many bytes to get from one set of values to the next
                                    // 0 = use type and numComponents above
          const offset = 0;         // how many bytes inside the buffer to start from
          gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
          gl.vertexAttribPointer(
              programInfo.attribLocations.vertexPosition,
              numComponents,
              type,
              normalize,
              stride,
              offset);
          gl.enableVertexAttribArray(
              programInfo.attribLocations.vertexPosition);
        }
   
        gl.useProgram(programInfo.program);

        // Set the drawing position to the "identity" point, which is
        // the center of the scene.
        const modelViewMatrix = mat4.create();
        const xRender = 0;
        const yRender = 0;
        const zRender = -5;
        
        mat4.translate(modelViewMatrix,     // destination matrix
                       modelViewMatrix,     // matrix to translate
                       [xRender, yRender, zRender]);  // amount to translate
        
        // Making the cube rotate
        const rads = Date.now()/1000;
        mat4.rotate(modelViewMatrix, 
                    modelViewMatrix, 
                    rads,
                    [0.1, 0.1, 0.1]);
        
        // Set the shader uniforms
        gl.uniformMatrix4fv(
            programInfo.uniformLocations.projectionMatrix,
            false,
            projectionMatrix);
        gl.uniformMatrix4fv(
            programInfo.uniformLocations.modelViewMatrix,
            false,
            modelViewMatrix);
    
        {
            const offset = 0;
            // gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
            gl.drawElements(gl.TRIANGLES, buffers.indexCount, gl.UNSIGNED_SHORT, offset);
        }
    }
}