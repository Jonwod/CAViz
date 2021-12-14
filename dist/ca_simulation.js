import { assert } from "./assert.js";
import { makeProgram } from "./gl_helpers.js";
export function createSimulation(ca, initialConfiguration) {
    if (ca.getNumDimensions() === 2) {
        return new CASimulation2D(ca, initialConfiguration);
    }
    else {
        assert(false, "TODO: Implement for dimensions  !=2");
    }
}
export class CASimulation {
    constructor(ca, initialConfiguration, width, height) {
        let div = document.createElement("div");
        this.canvas = document.createElement("canvas");
        this.canvas.width = width;
        this.canvas.height = height;
        this.gl = this.canvas.getContext("webgl2");
        if (this.gl === null) {
            alert("Unable to initialize WebGL. Your browser or machine may not support it.");
            return null;
        }
        this.gl.clearColor(0, 0, 0, 1);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        div.appendChild(this.canvas);
        this.rootElement = div;
    }
    getHTML() {
        return this.rootElement;
    }
    getCanvasWidth() {
        return this.canvas.width;
    }
    getCanvasHeight() {
        return this.canvas.height;
    }
}
class CASimulation2D extends CASimulation {
    constructor(ca, initialConfiguration) {
        super(ca, initialConfiguration, 1024, 1024);
        const gl = this.gl;
        const worldSize = 1024;
        this.worldSize = worldSize;
        this.readBuffer = gl.createTexture();
        this.writeBuffer = gl.createTexture();
        {
            const level = 0;
            const internalFormat = gl.RGBA8UI;
            const border = 0;
            const format = gl.RGBA_INTEGER;
            const type = gl.UNSIGNED_BYTE;
            const initConf = initialConfiguration.getData();
            let data = new Uint8Array(initConf.length * 4);
            for (let i = 0, j = 0; i < initConf.length; ++i) {
                data[j++] = initConf[i];
                data[j++] = initConf[i];
                data[j++] = initConf[i];
                data[j++] = initConf[i];
            }
            gl.bindTexture(gl.TEXTURE_2D, this.readBuffer);
            gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, worldSize, worldSize, border, format, type, data);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.bindTexture(gl.TEXTURE_2D, this.writeBuffer);
            gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, worldSize, worldSize, border, format, type, null);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            this.frameBuffer = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);
            const attachmentPoint = gl.COLOR_ATTACHMENT0;
            gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, this.writeBuffer, level);
        }
        this.renderProgramInfo = {
            program: null,
            attribLocations: null,
            uniformLocations: null,
            vertexShaderSource: `#version 300 es
                // ~~~ Render Vertex Shader ~~~
                in vec4 aVertexPosition;
                in vec2 aTexCoord;
                out vec2 vTexCoord;
            
                void main() {
                    gl_Position = aVertexPosition;
                    vTexCoord = aTexCoord;
                }
            `,
            fragmentShaderSource: `#version 300 es
                // ~~~ Render Fragment Shader ~~~
                precision mediump float;
                precision lowp usampler2D;

                // Passed in from the vertex shader.
                in vec2 vTexCoord;

                // The texture.
                uniform usampler2D uReadBuffer;

                out vec4 fragColor;

                void main() {
                    uint x = texture(uReadBuffer, vTexCoord).a;
                    float drawValue = x == 1u ? 1.0 : 0.0;
                    fragColor = vec4(drawValue, drawValue, drawValue, 1);
                }
            `,
        };
        this.computeProgramInfo = {
            program: null,
            attribLocations: null,
            uniformLocations: null,
            vertexShaderSource: `#version 300 es
                // ~~~ Compute Vertex Shader ~~~
                in vec4 aVertexPosition;
                in vec2 aTexCoord;
                out vec2 vTexCoord;
            
                void main() {
                    gl_Position = aVertexPosition;
                    vTexCoord = aTexCoord;
                }
            `,
            fragmentShaderSource: `#version 300 es
                // ~~~ Compute Fragment Shader ~~~
                precision mediump float;
                precision lowp usampler2D;
                // Passed in from the vertex shader.
                in vec2 vTexCoord;

                // The texture.
                uniform usampler2D uReadBuffer;

                out uvec4 fragColor;

                void main() {
                    ivec2 texSize = textureSize(uReadBuffer, 0);
                    ivec2 iTexCoords = ivec2( 
                        float(texSize.x) * vTexCoord.x,
                        float(texSize.y) * vTexCoord.y
                    );
                    ivec2 offsets[8] = ivec2[8](
                        ivec2(-1, 1), ivec2(0, 1), ivec2(1, 1),
                        ivec2(-1, 0),              ivec2(1, 0),
                        ivec2(-1, -1),ivec2(0, -1),ivec2(1, -1)
                    );

                    uint n = 0u;
                    // NOTE the literal loop limit. Not sure if can use variable
                    for(int i = 0; i < 8; ++i) {
                        ivec2 nCoords = iTexCoords + offsets[i];
                        nCoords.x -= texSize.x * (nCoords.x / texSize.x);
                        nCoords.y -= texSize.y * (nCoords.y / texSize.y);
                        n += texelFetch(uReadBuffer, nCoords, 0).a;
                    }

                    ivec2 iCellCoords = ivec2(vTexCoord);
                    uint x = texture(uReadBuffer, vTexCoord).a;

                    uint newState = x;
                    if(x == 1u  &&  (n < 2u || n > 3u)) {
                        newState = 0u;
                    }
                    else if(x == 0u  &&  n == 3u) {
                        newState = 1u;
                    }

                    fragColor = uvec4(0, 0, 0, newState);
                }
            `
        };
        this.renderProgramInfo.program = makeProgram(gl, this.renderProgramInfo.vertexShaderSource, this.renderProgramInfo.fragmentShaderSource);
        this.renderProgramInfo.attribLocations = {
            vertexPosition: this.gl.getAttribLocation(this.renderProgramInfo.program, 'aVertexPosition'),
            texCoord: this.gl.getAttribLocation(this.renderProgramInfo.program, "aTexCoord"),
        };
        this.renderProgramInfo.uniformLocations = {
            perspectiveMatrix: this.gl.getUniformLocation(this.renderProgramInfo.program, 'uPerspectiveMatrix'),
            modelViewMatrix: this.gl.getUniformLocation(this.renderProgramInfo.program, 'uModelViewMatrix'),
            uReadBuffer: this.gl.getUniformLocation(this.renderProgramInfo.program, 'uReadBuffer'),
        };
        this.computeProgramInfo.program = makeProgram(gl, this.computeProgramInfo.vertexShaderSource, this.computeProgramInfo.fragmentShaderSource);
        this.computeProgramInfo.attribLocations = {
            vertexPosition: this.gl.getAttribLocation(this.computeProgramInfo.program, 'aVertexPosition'),
            texCoord: this.gl.getAttribLocation(this.computeProgramInfo.program, "aTexCoord"),
        };
        this.computeProgramInfo.uniformLocations = {
            uReadBuffer: this.gl.getUniformLocation(this.computeProgramInfo.program, 'uReadBuffer'),
        };
        const squareVerts = [
            -1, 1, 0,
            -1, -1, 0,
            1, -1, 0,
            1, 1, 0
        ];
        const squareIndices = [0, 1, 2, 0, 2, 3];
        const squareUVs = [
            0.0, 1.0,
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0
        ];
        this.buffers = {
            position: null,
            positionCount: squareVerts.length,
            index: null,
            indexCount: squareIndices.length,
            uv: null,
            uvCount: null
        };
        this.buffers.position = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(squareVerts), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        {
            const numComponents = 3;
            const type = this.gl.FLOAT;
            const normalize = false;
            const stride = 0;
            const offset = 0;
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.position);
            this.gl.vertexAttribPointer(this.renderProgramInfo.attribLocations.vertexPosition, numComponents, type, normalize, stride, offset);
            this.gl.enableVertexAttribArray(this.renderProgramInfo.attribLocations.vertexPosition);
        }
        this.buffers.index = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.index);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(squareIndices), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
        this.buffers.uv = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.uv);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(squareUVs), gl.STATIC_DRAW);
        {
            const num = 2;
            const type = gl.FLOAT;
            const normalize = false;
            const stride = 0;
            const offset = 0;
            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.uv);
            gl.vertexAttribPointer(this.renderProgramInfo.attribLocations.texCoord, num, type, normalize, stride, offset);
            gl.enableVertexAttribArray(this.renderProgramInfo.attribLocations.texCoord);
        }
    }
    swapBuffers() {
        const gl = this.gl;
        const temp = this.readBuffer;
        this.readBuffer = this.writeBuffer;
        this.writeBuffer = temp;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);
        const attachmentPoint = gl.COLOR_ATTACHMENT0;
        gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, this.writeBuffer, 0);
    }
    run() {
        const drawRate = 60.0;
        const caUpdateRate = 60.0;
        let lastDrawStamp, lastCaUpdateStamp;
        let that = this;
        function tick(timestamp) {
            if (lastDrawStamp === undefined)
                lastDrawStamp = timestamp;
            if (lastCaUpdateStamp === undefined)
                lastCaUpdateStamp = timestamp;
            const timeSinceDraw = timestamp - lastDrawStamp;
            if ((timeSinceDraw / 1000.0) >= (1.0 / drawRate)) {
                that.render();
                lastDrawStamp = timestamp;
            }
            const timeSinceCaUpdate = timestamp - lastCaUpdateStamp;
            if ((timeSinceCaUpdate / 1000.0) >= (1.0 / caUpdateRate)) {
                that.update();
                lastCaUpdateStamp = timestamp;
            }
            window.requestAnimationFrame(tick);
        }
        window.requestAnimationFrame(tick);
    }
    render() {
        const gl = this.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, this.getCanvasWidth(), this.getCanvasHeight());
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(this.renderProgramInfo.program);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.readBuffer);
        gl.uniform1i(this.renderProgramInfo.uniformLocations.uReadBuffer, 0);
        gl.clearColor(0.5, 0.5, 0.5, 1);
        gl.clear(this.gl.COLOR_BUFFER_BIT);
        gl.clearDepth(1.0);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.index);
        gl.drawElements(gl.TRIANGLES, this.buffers.indexCount, gl.UNSIGNED_SHORT, 0);
    }
    update() {
        const gl = this.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);
        gl.viewport(0, 0, this.worldSize, this.worldSize);
        gl.useProgram(this.computeProgramInfo.program);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.readBuffer);
        gl.uniform1i(this.computeProgramInfo.uniformLocations.uReadBuffer, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.index);
        gl.drawElements(gl.TRIANGLES, this.buffers.indexCount, gl.UNSIGNED_SHORT, 0);
        this.swapBuffers();
    }
}
