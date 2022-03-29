import { makeProgram } from './gl_helpers.js';
import { allCoordConvertFuncs, myMod } from './glsl_functions.js';
export class VoxelMesh {
    constructor(gl, gridSize, voxelSize, gridSpacing) {
        this.gridSize = gridSize;
        this.voxelSize = voxelSize;
        this.gridSpacing = gridSpacing;
        this.gl = gl;
        let buffers = this.initBuffers();
        let positions = buffers.positions;
        let indices = buffers.indices;
        let normals = buffers.normals;
        this.programInfo = {
            program: null,
            attribLocations: null,
            uniformLocations: null,
            vertexShaderSource: `#version 300 es
            // ---- VOXEL MESH VERTEX SHADER ----
                precision lowp usampler2D;
                in vec3 aVertexPosition;
                in vec3 aVertexNormal;

                uniform mat4 uModelViewMatrix;
                uniform mat4 uPerspectiveMatrix;
                uniform mat4 uNormalMatrix;

                uniform int uWorldSize;

                uniform float uSpacing;

                out highp vec3 vLighting;

                // 2D texture but represents 3D world
                uniform usampler2D uReadBuffer;
            `
                +
                    myMod
                +
                    allCoordConvertFuncs
                +
                    `

                uint getCellState(int index) {
                    return texelFetch(uReadBuffer, toTextureCoords(index), 0).a;
                }
                uint getCellState(ivec3 coords) {
                    return getCellState(toIndex(coords));
                }

                void main() {
                    uint cellState = getCellState(gl_InstanceID);

                    // This is the bit that will want to change if we are doing colours instead or whatever
                    if(cellState == 0u) {
                        // Vertex outside of NDC area to render it invisible
                        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
                    }
                    else {
                        ivec3 voxelCoords = to3DCoords(gl_InstanceID);
                        float gridOffset = -(uSpacing * float(uWorldSize)) / 2.0;
                        vec3 voxelOffset = vec3(voxelCoords) * uSpacing;
                        gl_Position = uPerspectiveMatrix * uModelViewMatrix * vec4(
                            aVertexPosition + voxelOffset + 
                            vec3(gridOffset, gridOffset, gridOffset)
                            , 1
                        );
                        highp vec3 ambientLight = vec3(0.3, 0.3, 0.3);
                        highp vec3 directionalLightColor = vec3(1, 1, 1);
                        highp vec3 directionalVector = normalize(vec3(0.85, 0.8, 0.75));
                        highp vec4 transformedNormal = uNormalMatrix * vec4(aVertexNormal, 1.0);
                        highp float directional = max(dot(transformedNormal.xyz, directionalVector), 0.0);
                        vLighting = ambientLight + (directionalLightColor * directional);
                    }
                    //
                }
           `,
            fragmentShaderSource: `#version 300 es
            // ---- VOXEL MESH FRAGMENT SHADER ----
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
            normalMatrix: gl.getUniformLocation(this.programInfo.program, 'uNormalMatrix'),
            gridSize: gl.getUniformLocation(this.programInfo.program, 'uWorldSize'),
            spacing: gl.getUniformLocation(this.programInfo.program, 'uSpacing'),
            readBuffer: gl.getUniformLocation(this.programInfo.program, 'uReadBuffer')
        };
        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);
        const positionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);
        {
            const numComponents = 3;
            const type = this.gl.FLOAT;
            const normalize = false;
            const stride = 0;
            const offset = 0;
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
            this.gl.vertexAttribPointer(this.programInfo.attribLocations.vertexPosition, numComponents, type, normalize, stride, offset);
            this.gl.enableVertexAttribArray(this.programInfo.attribLocations.vertexPosition);
        }
        const normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
        {
            const numComponents = 3;
            const type = gl.FLOAT;
            const normalize = false;
            const stride = 0;
            const offset = 0;
            gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
            gl.vertexAttribPointer(this.programInfo.attribLocations.vertexNormal, numComponents, type, normalize, stride, offset);
            gl.enableVertexAttribArray(this.programInfo.attribLocations.vertexNormal);
        }
        const indexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), this.gl.STATIC_DRAW);
        gl.bindVertexArray(null);
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
    render(modelViewMatrix, perspectiveMatrix, cellDataTexture) {
        const programInfo = this.programInfo;
        const buffers = this.buffers;
        const gl = this.gl;
        gl.useProgram(programInfo.program);
        const normalMatrix = mat4.create();
        mat4.invert(normalMatrix, modelViewMatrix);
        mat4.transpose(normalMatrix, normalMatrix);
        gl.uniformMatrix4fv(programInfo.uniformLocations.perspectiveMatrix, false, perspectiveMatrix);
        gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);
        gl.uniformMatrix4fv(programInfo.uniformLocations.normalMatrix, false, normalMatrix);
        gl.uniform1i(programInfo.uniformLocations.gridSize, this.gridSize);
        gl.uniform1f(programInfo.uniformLocations.spacing, this.gridSpacing);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, cellDataTexture);
        gl.uniform1i(this.programInfo.uniformLocations.readBuffer, 0);
        gl.bindVertexArray(this.vao);
        {
            const offset = 0;
            const instanceCount = Math.pow(this.gridSize, 3);
            gl.drawElementsInstanced(gl.TRIANGLES, buffers.indexCount, gl.UNSIGNED_SHORT, offset, instanceCount);
        }
        gl.bindVertexArray(null);
    }
    initBuffers() {
        const positions = [
            -0.5, -0.5, 0.5,
            0.5, -0.5, 0.5,
            0.5, 0.5, 0.5,
            -0.5, 0.5, 0.5,
            -0.5, -0.5, -0.5,
            -0.5, 0.5, -0.5,
            0.5, 0.5, -0.5,
            0.5, -0.5, -0.5,
            -0.5, 0.5, -0.5,
            -0.5, 0.5, 0.5,
            0.5, 0.5, 0.5,
            0.5, 0.5, -0.5,
            -0.5, -0.5, -0.5,
            0.5, -0.5, -0.5,
            0.5, -0.5, 0.5,
            -0.5, -0.5, 0.5,
            0.5, -0.5, -0.5,
            0.5, 0.5, -0.5,
            0.5, 0.5, 0.5,
            0.5, -0.5, 0.5,
            -0.5, -0.5, -0.5,
            -0.5, -0.5, 0.5,
            -0.5, 0.5, 0.5,
            -0.5, 0.5, -0.5,
        ];
        for (let i = 0; i < positions.length; ++i) {
            positions[i] *= this.voxelSize;
        }
        const indices = [
            0, 1, 2, 0, 2, 3,
            4, 5, 6, 4, 6, 7,
            8, 9, 10, 8, 10, 11,
            12, 13, 14, 12, 14, 15,
            16, 17, 18, 16, 18, 19,
            20, 21, 22, 20, 22, 23,
        ];
        const vertexNormals = [
            0.0, 0.0, 1.0,
            0.0, 0.0, 1.0,
            0.0, 0.0, 1.0,
            0.0, 0.0, 1.0,
            0.0, 0.0, -1.0,
            0.0, 0.0, -1.0,
            0.0, 0.0, -1.0,
            0.0, 0.0, -1.0,
            0.0, 1.0, 0.0,
            0.0, 1.0, 0.0,
            0.0, 1.0, 0.0,
            0.0, 1.0, 0.0,
            0.0, -1.0, 0.0,
            0.0, -1.0, 0.0,
            0.0, -1.0, 0.0,
            0.0, -1.0, 0.0,
            1.0, 0.0, 0.0,
            1.0, 0.0, 0.0,
            1.0, 0.0, 0.0,
            1.0, 0.0, 0.0,
            -1.0, 0.0, 0.0,
            -1.0, 0.0, 0.0,
            -1.0, 0.0, 0.0,
            -1.0, 0.0, 0.0
        ];
        return { positions, indices, normals: vertexNormals };
    }
}
