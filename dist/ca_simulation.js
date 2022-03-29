import { assert } from "./assert.js";
import { Configuration } from "./configuration.js";
import { makeProgram } from "./gl_helpers.js";
import { VoxelMesh } from "./voxel_mesh.js";
import { Camera } from "./camera.js";
import { TotalisticTransitionRule } from "./transition_rule.js";
import { NumberDisplay } from "./ui/number_display.js";
import { ToggleButton } from "./ui/toggle_button.js";
import { Table } from "./ui/table.js";
import { NumberInput } from "./ui/number_input.js";
export class CASimulation {
    constructor(ca, initialConfiguration, width, height) {
        this.terminated = false;
        this.drawFlat = false;
        this.ui = {
            pauseButton: null,
            updateRateInput: null,
            updateRateActual: null
        };
        this.stats = {
            capture: true,
            liveCells: 0,
        };
        const worldSize = initialConfiguration.getSize();
        this.worldSize = worldSize;
        this.cellularAutomaton = ca;
        this.makeUI(width, height);
        const gl = this.canvas.getContext("webgl2");
        if (gl === null) {
            alert("Unable to initialize WebGL. Your browser or machine may not support it.");
            return null;
        }
        this.gl = gl;
        this.gl.clearColor(0, 0, 0, 1);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.readBuffer = gl.createTexture();
        this.writeBuffer = gl.createTexture();
        const numCells = initialConfiguration.getData().length;
        const textureSize = Math.ceil(Math.sqrt(numCells));
        this.textureSize = textureSize;
        this.drawFlat = ca.getNumDimensions() < 3;
        this.setWorldState(initialConfiguration);
        this.frameBuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);
        {
            const attachmentPoint = gl.COLOR_ATTACHMENT0;
            const level = 0;
            gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, this.writeBuffer, level);
        }
        this.renderProgram2DInfo = {
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
            fragmentShaderSource: null
        };
        this.computeProgramInfo.fragmentShaderSource =
            `#version 300 es
        // ~~~ Compute Fragment Shader ~~~
        precision mediump float;
        precision lowp usampler2D;

        // Passed in from the vertex shader
        in vec2 vTexCoord;

        // The texture containing current world state
        uniform usampler2D uReadBuffer;

        uniform int uWorldSize;

        out uvec4 fragColor;
        `;
        if (ca.getNumDimensions() > 2) {
            this.computeProgramInfo.fragmentShaderSource +=
                `
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
            `;
        }
        assert(ca.getTransitionRule() instanceof TotalisticTransitionRule, "Only totalistic cellular automata are supported for running on GPU, currently");
        let ttr = ca.getTransitionRule();
        this.computeProgramInfo.fragmentShaderSource += ttr.makeShaderTransitionFunction();
        this.computeProgramInfo.fragmentShaderSource +=
            `
        void main() {
            ivec2 texSize = textureSize(uReadBuffer, 0);
            ivec2 iTexCoords = ivec2( 
                float(texSize.x) * vTexCoord.x,
                float(texSize.y) * vTexCoord.y
            );

            uint n = 0u;
        `;
        if (ca.getNumDimensions() === 2) {
            this.computeProgramInfo.fragmentShaderSource +=
                `
            ivec2 offsets[8] = ivec2[8](
                ivec2(-1, 1), ivec2(0, 1), ivec2(1, 1),
                ivec2(-1, 0),              ivec2(1, 0),
                ivec2(-1, -1),ivec2(0, -1),ivec2(1, -1)
            );

            for(int i = 0; i < offsets.length(); ++i) {
                ivec2 nCoords = iTexCoords + offsets[i];
                nCoords.x -= texSize.x * (nCoords.x / texSize.x);
                nCoords.y -= texSize.y * (nCoords.y / texSize.y);
                n += texelFetch(uReadBuffer, nCoords, 0).a;
            }
            `;
        }
        else if (ca.getNumDimensions() === 3) {
            this.computeProgramInfo.fragmentShaderSource +=
                `
            int coord1D = iTexCoords.x * texSize.x + iTexCoords.y;
            ivec3 i3DCoords = to3DCoords(coord1D);
            for(int dx = -1; dx < 2; ++dx) {
                for(int dy = -1; dy < 2; ++dy) {
                    for(int dz = -1; dz < 2; ++dz) {
                        // if(dx == 0  &&  dy == 0  &&  dz == 0) {
                        //     continue;
                        // }
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
            uint thisCellState = texture(uReadBuffer, vTexCoord).a;
            // Already counted thisCellState in the loop to avoid branching
            n -= thisCellState;
            `;
        }
        else {
            assert(false, `sorry, ${ca.getNumDimensions()} dimensions not yet supported`);
        }
        this.computeProgramInfo.fragmentShaderSource +=
            `
fragColor = uvec4(0, 0, 0, totalisticTransitionFunction(thisCellState, n));
`;
        this.computeProgramInfo.fragmentShaderSource +=
            `
        }
        `;
        this.renderProgram2DInfo.program = makeProgram(gl, this.renderProgram2DInfo.vertexShaderSource, this.renderProgram2DInfo.fragmentShaderSource);
        this.renderProgram2DInfo.attribLocations = {
            vertexPosition: this.gl.getAttribLocation(this.renderProgram2DInfo.program, 'aVertexPosition'),
            texCoord: this.gl.getAttribLocation(this.renderProgram2DInfo.program, "aTexCoord"),
        };
        this.renderProgram2DInfo.uniformLocations = {
            perspectiveMatrix: this.gl.getUniformLocation(this.renderProgram2DInfo.program, 'uPerspectiveMatrix'),
            modelViewMatrix: this.gl.getUniformLocation(this.renderProgram2DInfo.program, 'uModelViewMatrix'),
            uReadBuffer: this.gl.getUniformLocation(this.renderProgram2DInfo.program, 'uReadBuffer'),
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
            this.gl.vertexAttribPointer(this.renderProgram2DInfo.attribLocations.vertexPosition, numComponents, type, normalize, stride, offset);
            this.gl.enableVertexAttribArray(this.renderProgram2DInfo.attribLocations.vertexPosition);
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
            gl.vertexAttribPointer(this.renderProgram2DInfo.attribLocations.texCoord, num, type, normalize, stride, offset);
            gl.enableVertexAttribArray(this.renderProgram2DInfo.attribLocations.texCoord);
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
    setWorldState(config) {
        const gl = this.gl;
        const level = 0;
        const internalFormat = gl.RGBA8UI;
        const border = 0;
        const format = gl.RGBA_INTEGER;
        const type = gl.UNSIGNED_BYTE;
        const initConf = config.getData();
        const textureSize = this.textureSize;
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
    getFramerate() {
        return this.framerate;
    }
    makeUI(canvasWidth, canvasHeight) {
        let topDiv = document.createElement("div");
        let div = document.createElement("div");
        topDiv.appendChild(div);
        div.style.display = 'flex';
        div.style.flexDirection = 'row';
        div.style.justifyContent = 'space-evenly';
        div.style.alignItems = 'center';
        let sidebar = document.createElement("div");
        sidebar.style.display = 'flex';
        sidebar.style.flexDirection = 'column';
        sidebar.style.alignItems = 'center';
        div.appendChild(sidebar);
        let mainContent = document.createElement("div");
        div.appendChild(mainContent);
        const that = this;
        {
            let controlTable = new Table(2);
            let label;
            label = document.createElement('p');
            label.innerHTML = "New pop. density: ";
            const defaultPopDensity = 0.34;
            let popDensityInput = new NumberInput(defaultPopDensity, false, () => {
                let v = popDensityInput.getValue();
                if (!popDensityInput.isValid() || v < 0 || v > 1) {
                    popDensityInput.setValue(defaultPopDensity);
                }
            }, 0, 1);
            controlTable.addRow([label, popDensityInput.getHTML()]);
            let resetConfigButton = document.createElement("button");
            resetConfigButton.innerText = "Randomize world";
            resetConfigButton.addEventListener("click", () => {
                let newConfig = Configuration.makeRandom(that.cellularAutomaton.getNumDimensions(), that.worldSize, that.cellularAutomaton.getNumStates(), popDensityInput.getValue());
                that.setWorldState(newConfig);
            });
            controlTable.addRow([resetConfigButton, null]);
            label = document.createElement('p');
            label.innerHTML = "Update Rate: ";
            const defaultUpdateRate = 60;
            this.ui.updateRateInput = new NumberInput(defaultUpdateRate, false, null, 0);
            controlTable.addRow([label, this.ui.updateRateInput.getHTML()]);
            label = document.createElement('p');
            label.innerHTML = "Achieved update rate: ";
            let actualUpdateRateDisplay = new NumberDisplay(0);
            this.ui.updateRateActual = {
                label: label,
                number: actualUpdateRateDisplay
            };
            controlTable.addRow([label, actualUpdateRateDisplay.getHTML()]);
            sidebar.appendChild(controlTable.getHTML());
        }
        let statTable = new Table(2);
        function addSeperatorToTable() {
            const lineString = "--------------------";
            let x = document.createElement("p");
            x.innerHTML = lineString;
            let x2 = document.createElement("p");
            x2.innerHTML = lineString;
            statTable.addRow([x, x2]);
        }
        addSeperatorToTable();
        let label = document.createElement("p");
        label.innerHTML = "FPS:";
        this.fpsCounter = new NumberDisplay(0);
        statTable.addRow([label, this.fpsCounter.getHTML()]);
        label = document.createElement('p');
        label.innerHTML = "Population Density:";
        this.popDensityDisplay = new NumberDisplay(5);
        statTable.addRow([label, this.popDensityDisplay.getHTML()]);
        label = document.createElement('p');
        label.innerHTML = "Live Cells:";
        this.liveCellsDisplay = new NumberDisplay(0);
        statTable.addRow([label, this.liveCellsDisplay.getHTML()]);
        addSeperatorToTable();
        let tog = new ToggleButton("images/pause.png", "images/play-button.png", { x: 64, y: 64 });
        this.ui.pauseButton = tog;
        sidebar.appendChild(tog.getHTML());
        sidebar.appendChild(statTable.getHTML());
        this.canvas = document.createElement("canvas");
        this.canvas.width = canvasWidth;
        this.canvas.height = canvasHeight;
        mainContent.appendChild(this.canvas);
        this.rootElement = topDiv;
        let attribDiv = document.createElement("div");
        attribDiv.innerHTML += `<a href="https://www.flaticon.com/free-icons/pause" title="pause icons">Pause icons created by bqlqn - Flaticon</a>
        <br/>
        <a href="https://www.flaticon.com/free-icons/video" title="video icons">Video icons created by Freepik - Flaticon</a>`;
        topDiv.appendChild(attribDiv);
    }
    isPaused() {
        return this.ui.pauseButton.getState();
    }
    run() {
        const drawRate = 60.0;
        let lastDrawStamp, lastCaUpdateStamp;
        let that = this;
        let targetUpdateDeltaTime = 1.0 / that.ui.updateRateInput.getValue();
        function updateLoop() {
            let timestamp = Date.now();
            if (lastCaUpdateStamp === undefined)
                lastCaUpdateStamp = timestamp;
            const timeSinceCaUpdate = (timestamp - lastCaUpdateStamp) / 1000.0;
            targetUpdateDeltaTime = 1.0 / that.ui.updateRateInput.getValue();
            if (!that.isPaused()) {
                that.update();
                lastCaUpdateStamp = timestamp;
                const updateRateActual = (1.0 / timeSinceCaUpdate);
                that.ui.updateRateActual.number.setValue(updateRateActual);
            }
            if (!that.terminated) {
                const timeWorking = Date.now() - timestamp;
                setTimeout(updateLoop, targetUpdateDeltaTime * 1000 - timeWorking);
            }
        }
        setTimeout(updateLoop, targetUpdateDeltaTime * 1000);
        function drawLoop(timestamp) {
            if (lastDrawStamp === undefined)
                lastDrawStamp = timestamp;
            const timeSinceDraw = timestamp - lastDrawStamp;
            if ((timeSinceDraw / 1000.0) >= (1.0 / drawRate)) {
                that.draw();
                lastDrawStamp = timestamp;
                that.framerate = (1.0 / timeSinceDraw) * 1000;
                that.fpsCounter.setValue(that.framerate);
            }
            if (!that.terminated) {
                window.requestAnimationFrame(drawLoop);
            }
        }
        window.requestAnimationFrame(drawLoop);
    }
    terminate() {
        this.terminated = true;
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
        gl.viewport(0, 0, gl.canvas.clientWidth, gl.canvas.clientHeight);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
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
        gl.useProgram(this.renderProgram2DInfo.program);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.readBuffer);
        gl.uniform1i(this.renderProgram2DInfo.uniformLocations.uReadBuffer, 0);
        gl.clearColor(0, 0.0, 0, 1);
        gl.clear(this.gl.COLOR_BUFFER_BIT);
        gl.bindVertexArray(this.vao);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.index);
        gl.drawElements(gl.TRIANGLES, this.buffers.indexCount, gl.UNSIGNED_SHORT, 0);
        gl.bindVertexArray(null);
    }
    swapBuffers() {
        const gl = this.gl;
        const temp = this.readBuffer;
        this.readBuffer = this.writeBuffer;
        this.writeBuffer = temp;
    }
    update() {
        const gl = this.gl;
        gl.useProgram(this.computeProgramInfo.program);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.readBuffer);
        gl.uniform1i(this.computeProgramInfo.uniformLocations.uReadBuffer, 0);
        gl.uniform1i(this.computeProgramInfo.uniformLocations.uWorldSize, this.worldSize);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);
        const attachmentPoint = gl.COLOR_ATTACHMENT0;
        gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, this.writeBuffer, 0);
        gl.viewport(0, 0, this.textureSize, this.textureSize);
        gl.bindVertexArray(this.vao);
        gl.drawElements(gl.TRIANGLES, this.buffers.indexCount, gl.UNSIGNED_SHORT, 0);
        gl.bindVertexArray(null);
        if (this.stats) {
            let pixels = new Uint32Array(this.textureSize * this.textureSize * 4);
            gl.readPixels(0, 0, this.textureSize, this.textureSize, gl.RGBA_INTEGER, gl.UNSIGNED_INT, pixels);
            this.updateStats(pixels);
        }
        this.swapBuffers();
    }
    getNumCellsInWorld() {
        return Math.pow(this.worldSize, this.cellularAutomaton.getNumDimensions());
    }
    setStatsEnabled(yes) {
        this.stats.capture = yes;
    }
    getLiveCells() {
        return this.stats.capture ? this.stats.liveCells : null;
    }
    getPopDensity() {
        return this.stats.capture ? this.stats.liveCells / this.getNumCellsInWorld() : null;
    }
    updateStats(worldTexture) {
        this.stats.liveCells = 0;
        for (let i = 0; i < worldTexture.length; ++i) {
            this.stats.liveCells += worldTexture[i];
        }
        this.liveCellsDisplay.setValue(this.stats.liveCells);
        this.popDensityDisplay.setValue(this.stats.liveCells / this.getNumCellsInWorld());
    }
}
