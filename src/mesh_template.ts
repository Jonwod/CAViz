import {loadShader} from './gl_helpers.js';
declare var mat4: any;

export class MeshTemplate {
    private buffers: {
        position;
        positionCount: number;
        index;
        indexCount: number;
    };
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

    private gl: WebGLRenderingContext;
    
    constructor(gl: WebGLRenderingContext, positions, indices) {
        this.gl = gl;
        // ~~~~~~~~~~ Program ~~~~~~~~~~~
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

        const vertexShader = loadShader(this.gl, this.gl.VERTEX_SHADER, this.programInfo.vertexShaderSource);
        const fragmentShader = loadShader(this.gl, this.gl.FRAGMENT_SHADER, this.programInfo.fragmentShaderSource);
      
        // Create the shader program
        this.programInfo.program = this.gl.createProgram();
        this.gl.attachShader(this.programInfo.program, vertexShader);
        this.gl.attachShader(this.programInfo.program, fragmentShader);
        this.gl.linkProgram(this.programInfo.program);
      
        // If creating the shader program failed, alert
        if (!this.gl.getProgramParameter(this.programInfo.program, this.gl.LINK_STATUS)) {
          alert('Unable to initialize the shader program: ' + this.gl.getProgramInfoLog(this.programInfo.program));
          return null;
        }
      
        this.programInfo.attribLocations = {
            vertexPosition: this.gl.getAttribLocation(this.programInfo.program, 'aVertexPosition'),
        };
        this.programInfo.uniformLocations = {
            projectionMatrix: this.gl.getUniformLocation(this.programInfo.program, 'uProjectionMatrix'),
            modelViewMatrix: this.gl.getUniformLocation(this.programInfo.program, 'uModelViewMatrix'),
        };
        // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

        const positionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER,
                      new Float32Array(positions),
                      this.gl.STATIC_DRAW);
      
        // Tell WebGL how to pull out the positions from the position
        // buffer into the vertexPosition attribute.
        {
            const numComponents = 3;  // pull out 2 values per iteration
            const type = this.gl.FLOAT;    // the data in the buffer is 32bit floats
            const normalize = false;  // don't normalize
            const stride = 0;         // how many bytes to get from one set of values to the next
                                      // 0 = use type and numComponents above
            const offset = 0;         // how many bytes inside the buffer to start from
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
            this.gl.vertexAttribPointer(
                this.programInfo.attribLocations.vertexPosition,
                numComponents,
                type,
                normalize,
                stride,
                offset);
            this.gl.enableVertexAttribArray(
                this.programInfo.attribLocations.vertexPosition);
        }

        const indexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        this.gl.bufferData(
            this.gl.ELEMENT_ARRAY_BUFFER,
            new Uint16Array(indices),
            this.gl.STATIC_DRAW
        );

        // Unbind buffer
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, null);

        this.buffers = {
            position: positionBuffer,
            positionCount: positions.length,
            index: indexBuffer,
            indexCount: indices.length,
        };
    }

    public render() {
        const programInfo = this.programInfo;
        const buffers = this.buffers;
        const gl = this.gl;

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
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.index);
            gl.drawElements(gl.TRIANGLES, buffers.indexCount, gl.UNSIGNED_SHORT, offset);
        }
    }
}