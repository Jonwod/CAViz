import {loadShader} from './gl_helpers.js';
declare var mat4: any;

// A lot of this is taken/adapted from Mozilla's WebGL tutorials, particularly:
// https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Lighting_in_WebGL

export class MeshTemplate {
    private buffers: {
        position;
        positionCount: number;
        index;
        indexCount: number;
        normal;
        normalCount: number;
    };
    private programInfo: {
        program: WebGLProgram;
        attribLocations: {
            vertexPosition: number;
            vertexNormal: number;
        };
        uniformLocations: {
            perspectiveMatrix: WebGLUniformLocation;
            modelViewMatrix: WebGLUniformLocation;
            normalMatrix:WebGLUniformLocation;
        },
        vertexShaderSource: String;
        fragmentShaderSource: String;
    };

    private gl: WebGLRenderingContext;
    
    constructor(gl: WebGLRenderingContext, positions, indices, normals: number[]) {
        this.gl = gl;
        // ~~~~~~~~~~ Program ~~~~~~~~~~~
        this.programInfo = {
            program: null,
            attribLocations: null,
            uniformLocations: null,
            vertexShaderSource: `
                attribute vec4 aVertexPosition;
                attribute vec3 aVertexNormal;

                uniform mat4 uModelViewMatrix;
                uniform mat4 uPerspectiveMatrix;
                uniform mat4 uNormalMatrix;

                varying highp vec3 vLighting;
            
                void main() {
                    gl_Position = uPerspectiveMatrix * uModelViewMatrix * aVertexPosition;
                    highp vec3 ambientLight = vec3(0.3, 0.3, 0.3);
                    highp vec3 directionalLightColor = vec3(1, 1, 1);
                    highp vec3 directionalVector = normalize(vec3(0.85, 0.8, 0.75));
                    highp vec4 transformedNormal = uNormalMatrix * vec4(aVertexNormal, 1.0);
                    highp float directional = max(dot(transformedNormal.xyz, directionalVector), 0.0);
                    vLighting = ambientLight + (directionalLightColor * directional);
                }
           `,
            fragmentShaderSource: `
                varying highp vec3 vLighting;
                void main() {
                    gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
                    gl_FragColor = vec4(vLighting, 1);
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
            vertexNormal: gl.getAttribLocation(this.programInfo.program, 'aVertexNormal')
        };
        this.programInfo.uniformLocations = {
            perspectiveMatrix: this.gl.getUniformLocation(this.programInfo.program, 'uPerspectiveMatrix'),
            modelViewMatrix: this.gl.getUniformLocation(this.programInfo.program, 'uModelViewMatrix'),
            normalMatrix: gl.getUniformLocation(this.programInfo.program, 'uNormalMatrix')
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

        const normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer); 
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

        // Tell WebGL how to pull out the normals from
        // the normal buffer into the vertexNormal attribute.
        {
            const numComponents = 3;
            const type = gl.FLOAT;
            const normalize = false;
            const stride = 0;
            const offset = 0;
            gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
            gl.vertexAttribPointer(
                this.programInfo.attribLocations.vertexNormal,
                numComponents,
                type,
                normalize,
                stride,
                offset);
            gl.enableVertexAttribArray(
                this.programInfo.attribLocations.vertexNormal);
        }

        // Unbind buffer
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, null);

        this.buffers = {
            position: positionBuffer,
            positionCount: positions.length,
            index: indexBuffer,
            indexCount: indices.length,
            normal: normalBuffer,
            normalCount: normals.length
        };
    }

    public render(modelViewMatrix, perspectiveMatrix) {
        const programInfo = this.programInfo;
        const buffers = this.buffers;
        const gl = this.gl;

        // Create a perspective matrix, a special matrix that is
        // used to simulate the distortion of perspective in a camera.
        // Our field of view is 45 degrees, with a width/height
        // ratio that matches the display size of the canvas
        // and we only want to see objects between 0.1 units
        // and 100 units away from the camera.
      
        gl.useProgram(programInfo.program);

        const normalMatrix = mat4.create();
        mat4.invert(normalMatrix, modelViewMatrix);
        mat4.transpose(normalMatrix, normalMatrix);
        
        // Set the shader uniforms
        gl.uniformMatrix4fv(
            programInfo.uniformLocations.perspectiveMatrix,
            false,
            perspectiveMatrix);
        gl.uniformMatrix4fv(
            programInfo.uniformLocations.modelViewMatrix,
            false,
            modelViewMatrix);

        gl.uniformMatrix4fv(
            programInfo.uniformLocations.normalMatrix,
            false,
            normalMatrix);
            
        {
            const offset = 0;
            // gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.index);
            gl.drawElements(gl.TRIANGLES, buffers.indexCount, gl.UNSIGNED_SHORT, offset);
        }
    }
}