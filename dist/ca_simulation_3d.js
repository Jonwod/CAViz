import { assert } from "./assert.js";
import { CASimulation } from "./ca_simulation.js";
import { makeProgram } from "./gl_helpers.js";
import { VoxelMesh } from "./voxel_mesh.js";
import { Camera } from "./camera.js";
export class CASimulation3D extends CASimulation {
    constructor(ca, initialConfiguration) {
        super(ca, initialConfiguration, initialConfiguration.getSize(), initialConfiguration.getSize());
        this.drawFlat = false;
        assert(initialConfiguration.getNumDimensions() === 3);
        const gl = this.gl;
        this.readBuffer = gl.createTexture();
        this.writeBuffer = gl.createTexture();
        const worldSize = this.worldSize;
        const numCells = initialConfiguration.getData().length;
        console.log(`${numCells} cells`);
        const textureSize = Math.ceil(Math.sqrt(numCells));
        this.textureSize = textureSize;
        this.canvas.width = 800;
        this.canvas.height = 800;
        let drawModeButton = document.createElement("button");
        drawModeButton.innerText = "Draw mode";
        drawModeButton.addEventListener("click", () => {
            this.drawFlat = !this.drawFlat;
        });
        this.rootElement.appendChild(drawModeButton);
        {
            const level = 0;
            const internalFormat = gl.RGBA8UI;
            const border = 0;
            const format = gl.RGBA_INTEGER;
            const type = gl.UNSIGNED_BYTE;
            const initConf = initialConfiguration.getData();
            let data = new Uint8Array(textureSize * textureSize * 4);
            for (let i = 0, j = 0; i < initConf.length; ++i) {
                data[j++] = initConf[i];
                data[j++] = initConf[i];
                data[j++] = initConf[i];
                data[j++] = initConf[i];
            }
            for (let i = initConf.length, j = initConf.length * 4; i < textureSize * textureSize; ++i) {
                data[j++] = 0;
                data[j++] = 0;
                data[j++] = 0;
                data[j++] = 0;
            }
            gl.bindTexture(gl.TEXTURE_2D, this.readBuffer);
            gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, textureSize, textureSize, border, format, type, data);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.bindTexture(gl.TEXTURE_2D, this.writeBuffer);
            gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, textureSize, textureSize, border, format, type, null);
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
                uniform int uWorldSize;

                out uvec4 fragColor;

                int myMod(int a, int b) {
                    return a - b * int(a / b);
                }

                ivec3 to3DCoords(int i) {
                    int planeSize = uWorldSize * uWorldSize;
                    int plane = i / planeSize;
                    int planeRemainder = myMod(i, planeSize);
                    int row = planeRemainder / uWorldSize;
                    int rowRemainder = myMod(planeRemainder, uWorldSize);
                    return ivec3(plane, row, rowRemainder);
                }

                int toIndex(ivec3 coords) {
                    return coords.x * uWorldSize * uWorldSize + coords.y * uWorldSize + coords.z;
                }

                ivec2 toTextureCoords(int index) {
                    int row = index / textureSize(uReadBuffer, 0).x;
                    int rowRemainder = myMod(index, textureSize(uReadBuffer, 0).x);
                    return ivec2(row, rowRemainder);
                }


                ivec2 toTextureCoords(ivec3 worldCoords) {
                    int index = toIndex(worldCoords);
                    return toTextureCoords(index);
                }


                uint getCellState(int index) {
                    return texelFetch(uReadBuffer, toTextureCoords(index), 0).a;
                }
                uint getCellState(ivec3 coords) {
                    return getCellState(toIndex(coords));
                }


                void main() {
                    ivec2 texSize = textureSize(uReadBuffer, 0);
                    ivec2 iTexCoords = ivec2( 
                        float(texSize.x) * vTexCoord.x,
                        float(texSize.y) * vTexCoord.y
                    );
                    int coord1D = iTexCoords.x * texSize.x + iTexCoords.y;
                    ivec3 i3DCoords = to3DCoords(coord1D);

                    uint n = 0u;
                    for(int dx = -1; dx < 2; ++dx) {
                        for(int dy = -1; dy < 2; ++dy) {
                            for(int dz = -1; dz < 2; ++dz) {
                                if(dx == 0  &&  dy == 0  &&  dz == 0) {
                                    continue;
                                }
                                ivec3 neighbour3DCoords = i3DCoords + ivec3(dx, dy, dz);
                                // ---- Wrap around ----
                                neighbour3DCoords.x -= uWorldSize * (neighbour3DCoords.x / uWorldSize);
                                neighbour3DCoords.y -= uWorldSize * (neighbour3DCoords.y / uWorldSize);
                                neighbour3DCoords.z -= uWorldSize * (neighbour3DCoords.z / uWorldSize);
                                // ---------------------
                                n += getCellState(neighbour3DCoords);
                            }
                        }
                    }

                    uint x = getCellState(i3DCoords);
                    uint newState = x;
                    


                    // (keepalive-reproduce)
                    // Bays' (5766) rule for 3D Life
                    // Testing (4526) rule for unbounded growth
                    if(x == 1u  && (n < 5u || n > 7u)) {
                        newState = 0u;
                    } else if(x == 0u &&  n >= 6u &&  n <= 6u) {
                        newState = 1u;
                    }


                    // if(x == 0u) {
                    //     newState = 1u;
                    // } else if(x == 1u) {
                    //     newState = 0u;
                    // }

                    // newState = 1u;

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
            uWorldSize: this.gl.getUniformLocation(this.computeProgramInfo.program, 'uWorldSize'),
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
        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);
        this.buffers.position = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(squareVerts), gl.STATIC_DRAW);
        {
            const numComponents = 3;
            const type = this.gl.FLOAT;
            const normalize = false;
            const stride = 0;
            const offset = 0;
            this.gl.vertexAttribPointer(this.renderProgramInfo.attribLocations.vertexPosition, numComponents, type, normalize, stride, offset);
            this.gl.enableVertexAttribArray(this.renderProgramInfo.attribLocations.vertexPosition);
        }
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
        this.buffers.uv = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.uv);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(squareUVs), gl.STATIC_DRAW);
        {
            const num = 2;
            const type = gl.FLOAT;
            const normalize = false;
            const stride = 0;
            const offset = 0;
            gl.vertexAttribPointer(this.renderProgramInfo.attribLocations.texCoord, num, type, normalize, stride, offset);
            gl.enableVertexAttribArray(this.renderProgramInfo.attribLocations.texCoord);
        }
        this.buffers.index = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.index);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(squareIndices), gl.STATIC_DRAW);
        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        this.voxelMesh = new VoxelMesh(this.gl, worldSize, 1.0, 1.2);
        const fieldOfView = 45 * Math.PI / 180;
        const aspect = this.gl.canvas.clientWidth / this.gl.canvas.clientHeight;
        const zNear = 0.1;
        const zFar = 1000.0;
        this.camera = new Camera(this.canvas, fieldOfView, aspect, zNear, zFar);
    }
    swapBuffers() {
        const gl = this.gl;
        const temp = this.readBuffer;
        this.readBuffer = this.writeBuffer;
        this.writeBuffer = temp;
    }
    draw() {
        if (this.drawFlat) {
            this.renderFlat();
        }
        else {
            this.render();
        }
    }
    render() {
        const gl = this.gl;
        gl.clearDepth(1.0);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, this.getCanvasWidth(), this.getCanvasHeight());
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        const aspect = this.gl.canvas.clientWidth / this.gl.canvas.clientHeight;
        this.camera.setAspectRatio(aspect);
        this.camera.processInput();
        const modelViewMatrix = mat4.create();
        const xRender = 0;
        const yRender = 0;
        const zRender = 0;
        mat4.translate(modelViewMatrix, modelViewMatrix, [xRender, yRender, zRender]);
        this.voxelMesh.render(modelViewMatrix, this.camera.getPerspectiveMatrix(), this.readBuffer);
    }
    renderFlat() {
        const gl = this.gl;
        gl.clearDepth(1.0);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, this.getCanvasWidth(), this.getCanvasHeight());
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(this.renderProgramInfo.program);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.readBuffer);
        gl.uniform1i(this.renderProgramInfo.uniformLocations.uReadBuffer, 0);
        gl.clearColor(0.2, 0.0, 0.5, 1);
        gl.clear(this.gl.COLOR_BUFFER_BIT);
        gl.bindVertexArray(this.vao);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.index);
        gl.drawElements(gl.TRIANGLES, this.buffers.indexCount, gl.UNSIGNED_SHORT, 0);
        gl.bindVertexArray(null);
    }
    update() {
        const gl = this.gl;
        gl.viewport(0, 0, this.textureSize, this.textureSize);
        gl.useProgram(this.computeProgramInfo.program);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.readBuffer);
        gl.uniform1i(this.computeProgramInfo.uniformLocations.uReadBuffer, 0);
        gl.uniform1i(this.computeProgramInfo.uniformLocations.uWorldSize, this.worldSize);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);
        const attachmentPoint = gl.COLOR_ATTACHMENT0;
        gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, this.writeBuffer, 0);
        gl.bindVertexArray(this.vao);
        gl.drawElements(gl.TRIANGLES, this.buffers.indexCount, gl.UNSIGNED_SHORT, 0);
        gl.bindVertexArray(null);
        this.swapBuffers();
    }
}
