import { loadShader } from "./gl_helpers.js";
export class Renderer {
    constructor(width, height) {
        let div = document.createElement("div");
        this.canvas = document.createElement("canvas");
        this.canvas.width = 800;
        this.canvas.height = 800;
        this.gl = this.canvas.getContext("webgl");
        if (this.gl === null) {
            alert("Unable to initialize WebGL. Your browser or machine may not support it.");
            return null;
        }
        this.gl.clearColor(0, 0, 0, 1);
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
    getHTML() {
        return this.rootElement;
    }
    initShaderProgram() {
        const vertexShader = loadShader(this.gl, this.gl.VERTEX_SHADER, this.programInfo.vertexShaderSource);
        const fragmentShader = loadShader(this.gl, this.gl.FRAGMENT_SHADER, this.programInfo.fragmentShaderSource);
        const shaderProgram = this.gl.createProgram();
        this.gl.attachShader(shaderProgram, vertexShader);
        this.gl.attachShader(shaderProgram, fragmentShader);
        this.gl.linkProgram(shaderProgram);
        if (!this.gl.getProgramParameter(shaderProgram, this.gl.LINK_STATUS)) {
            alert('Unable to initialize the shader program: ' + this.gl.getProgramInfoLog(shaderProgram));
            return null;
        }
        return shaderProgram;
    }
    initBuffers() {
        const positions = [
            -0.5, 0.5, 0.5,
            0.5, 0.5, 0.5,
            -0.5, -0.5, 0.5,
            0.5, -0.5, 0.5,
            -0.5, 0.5, -0.5,
            0.5, 0.5, -0.5,
            -0.5, -0.5, -0.5,
            0.5, -0.5, -0.5,
        ];
        const indices = [
            0, 1, 2,
            1, 2, 3,
            2, 3, 6,
            3, 6, 7,
            0, 1, 4,
            1, 4, 5,
            6, 7, 4,
            4, 5, 7,
            0, 2, 6,
            0, 4, 6,
            1, 3, 7,
            1, 5, 7
        ];
        const positionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);
        const indexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), this.gl.STATIC_DRAW);
        return {
            position: positionBuffer,
            positionCount: positions.length,
            index: indexBuffer,
            indexCount: indices.length
        };
    }
    render() {
        const gl = this.gl;
        const programInfo = this.programInfo;
        const buffers = this.buffers;
        gl.clearDepth(1.0);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        const fieldOfView = 45 * Math.PI / 180;
        const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        const zNear = 0.1;
        const zFar = 1000.0;
        const projectionMatrix = mat4.create();
        mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);
        gl.useProgram(programInfo.program);
        const modelViewMatrix = mat4.create();
        const xRender = 0;
        const yRender = 0;
        const zRender = -5;
        mat4.translate(modelViewMatrix, modelViewMatrix, [xRender, yRender, zRender]);
        const rads = Date.now() / 1000;
        mat4.rotate(modelViewMatrix, modelViewMatrix, rads, [0.1, 0.1, 0.1]);
        gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
        gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);
        {
            const offset = 0;
            gl.drawElements(gl.TRIANGLES, buffers.indexCount, gl.UNSIGNED_SHORT, offset);
        }
    }
}
