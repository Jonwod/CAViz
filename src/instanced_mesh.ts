import {makeProgram} from './gl_helpers.js';
declare var mat4: any;

// A lot of this is taken/adapted from Mozilla's WebGL tutorials, particularly:
// https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Lighting_in_WebGL

export class InstancedMesh {
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

    private gl: WebGL2RenderingContext;
    
    constructor(gl: WebGL2RenderingContext, positions, indices, normals: number[]) {
        this.gl = gl;
        // ~~~~~~~~~~ Program ~~~~~~~~~~~
        this.programInfo = {
            program: null,
            attribLocations: null,
            uniformLocations: null,
            vertexShaderSource: `#version 300 es
                in vec4 aVertexPosition;
                in vec3 aVertexNormal;

                uniform mat4 uModelViewMatrix;
                uniform mat4 uPerspectiveMatrix;
                uniform mat4 uNormalMatrix;

                out highp vec3 vLighting;

                // 2D texture but represents 3D world
                // uniform usampler2D uWorldTexture3D;

                void main() {
                    gl_Position = uPerspectiveMatrix * uModelViewMatrix * aVertexPosition + vec4(gl_InstanceID, gl_InstanceID, gl_InstanceID, gl_InstanceID);
                    highp vec3 ambientLight = vec3(0.3, 0.3, 0.3);
                    highp vec3 directionalLightColor = vec3(1, 1, 1);
                    highp vec3 directionalVector = normalize(vec3(0.85, 0.8, 0.75));
                    highp vec4 transformedNormal = uNormalMatrix * vec4(aVertexNormal, 1.0);
                    highp float directional = max(dot(transformedNormal.xyz, directionalVector), 0.0);
                    vLighting = ambientLight + (directionalLightColor * directional);
                }
           `,
            fragmentShaderSource: `#version 300 es
                precision mediump float;
                in highp vec3 vLighting;
                out vec4 fragColor;

                void main() {
                    fragColor = vec4(1.0, 1.0, 1.0, 1.0);
                    fragColor = vec4(vLighting, 1);
                }
           `,
        };
        
        this.programInfo.program = makeProgram(this.gl, this.programInfo.vertexShaderSource, this.programInfo.fragmentShaderSource);
      
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

    public render(modelViewMatrix, perspectiveMatrix, instanceCount: number) {
        const programInfo = this.programInfo;
        const buffers = this.buffers;
        const gl = this.gl;
      
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
            gl.drawElementsInstanced(gl.TRIANGLES, buffers.indexCount, gl.UNSIGNED_SHORT, offset, instanceCount);
        }
    }
}