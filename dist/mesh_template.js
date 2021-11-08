import { loadShader } from './gl_helpers.js';
export class MeshTemplate {
    constructor(gl, positions, indices, normals) {
        this.gl = gl;
        this.programInfo = {
            program: null,
            attribLocations: null,
            uniformLocations: null,
            vertexShaderSource: `
                attribute vec4 aVertexPosition;
                attribute vec3 aVertexNormal;

                uniform mat4 uModelViewMatrix;
                uniform mat4 uProjectionMatrix;
                uniform mat4 uNormalMatrix;

                varying highp vec3 vLighting;
            
                void main() {
                    gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
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
        this.programInfo.program = this.gl.createProgram();
        this.gl.attachShader(this.programInfo.program, vertexShader);
        this.gl.attachShader(this.programInfo.program, fragmentShader);
        this.gl.linkProgram(this.programInfo.program);
        if (!this.gl.getProgramParameter(this.programInfo.program, this.gl.LINK_STATUS)) {
            alert('Unable to initialize the shader program: ' + this.gl.getProgramInfoLog(this.programInfo.program));
            return null;
        }
        this.programInfo.attribLocations = {
            vertexPosition: this.gl.getAttribLocation(this.programInfo.program, 'aVertexPosition'),
            vertexNormal: gl.getAttribLocation(this.programInfo.program, 'aVertexNormal')
        };
        this.programInfo.uniformLocations = {
            projectionMatrix: this.gl.getUniformLocation(this.programInfo.program, 'uProjectionMatrix'),
            modelViewMatrix: this.gl.getUniformLocation(this.programInfo.program, 'uModelViewMatrix'),
            normalMatrix: gl.getUniformLocation(this.programInfo.program, 'uNormalMatrix')
        };
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
        const indexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), this.gl.STATIC_DRAW);
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
    render(modelViewMatrix) {
        const programInfo = this.programInfo;
        const buffers = this.buffers;
        const gl = this.gl;
        const fieldOfView = 45 * Math.PI / 180;
        const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        const zNear = 0.1;
        const zFar = 1000.0;
        const projectionMatrix = mat4.create();
        mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);
        gl.useProgram(programInfo.program);
        const normalMatrix = mat4.create();
        mat4.invert(normalMatrix, modelViewMatrix);
        mat4.transpose(normalMatrix, normalMatrix);
        gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
        gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);
        gl.uniformMatrix4fv(programInfo.uniformLocations.normalMatrix, false, normalMatrix);
        {
            const offset = 0;
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.index);
            gl.drawElements(gl.TRIANGLES, buffers.indexCount, gl.UNSIGNED_SHORT, offset);
        }
    }
}
