import { CellularAutomaton } from "./cellular_automaton.js";
import { Configuration } from "./configuration.js";
import { CASimulation } from "./ca_simulation.js";
import { makeProgram } from "./gl_helpers.js";


export class CASimulation2D extends CASimulation {
    constructor(ca: CellularAutomaton, initialConfiguration: Configuration) {
        // Used https://webglfundamentals.org/webgl/lessons/webgl-render-to-texture.html
        // for reference on frame buffers and rendering to a texture.
        super(ca, initialConfiguration, initialConfiguration.getSize(), initialConfiguration.getSize());
        const gl = this.gl;

        this.readBuffer = gl.createTexture();
        this.writeBuffer = gl.createTexture();

        const worldSize = this.worldSize;

        {
            const level = 0;
            const internalFormat = gl.RGBA8UI;
            const border = 0;
            const format = gl.RGBA_INTEGER;
            const type = gl.UNSIGNED_BYTE;
            const initConf = initialConfiguration.getData();

            // Init readbuffer to initial CA configuration
            let data = new Uint8Array(initConf.length * 4);
            for(let i = 0, j = 0; i < initConf.length; ++i) {
                // This is silly
                data[j++] = initConf[i];
                data[j++] = initConf[i];
                data[j++] = initConf[i];
                data[j++] = initConf[i];
            }
            gl.bindTexture(gl.TEXTURE_2D, this.readBuffer);
            gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                worldSize, worldSize, border,
                format, type, data);

            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

            // Init writebuffer
            gl.bindTexture(gl.TEXTURE_2D, this.writeBuffer);
            gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                worldSize, worldSize, border,
                format, type, null);

            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

            // Create and bind the framebuffer
            // After binding the framebuffer, draw calls will draw to it
            this.frameBuffer = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer); 
            
            // attach the texture as the first color attachment
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
                    for(int i = 0; i < offsets.length(); ++i) {
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
        }


        // ++++++++++++++++ RENDER PROGRAM ++++++++++++++++++++
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
        // +++++++++++++++++++++++++++++++++++++++++++++++++++++

        // ++++++++++++++ COMPUTE PROGRAM ++++++++++++++++++++++
        this.computeProgramInfo.program = makeProgram(gl, this.computeProgramInfo.vertexShaderSource, this.computeProgramInfo.fragmentShaderSource);
        this.computeProgramInfo.attribLocations = {
            vertexPosition: this.gl.getAttribLocation(this.computeProgramInfo.program, 'aVertexPosition'),
            texCoord: this.gl.getAttribLocation(this.computeProgramInfo.program, "aTexCoord"),
        };
        this.computeProgramInfo.uniformLocations = {
            uReadBuffer: this.gl.getUniformLocation(this.computeProgramInfo.program, 'uReadBuffer'),
        };
        // ++++++++++++++++++++++++++++++++++++++++++++++++++++

        // ================== DATA =====================
        const squareVerts = [
            -1, 1, 0, // tl
            -1,-1, 0,  // bl
             1,-1, 0,   // br
             1, 1, 0   // tr
        ];
        const squareIndices = [0,1,2,0,2,3];
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

        // Setup position buffer
        this.buffers.position = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(squareVerts), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);

        // Tell WebGL how to pull out the positions from the position
        // buffer into the vertexPosition attribute.
        {
            const numComponents = 3;  // pull out 2 values per iteration
            const type = this.gl.FLOAT;    // the data in the buffer is 32bit floats
            const normalize = false;  // don't normalize
            const stride = 0;         // how many bytes to get from one set of values to the next
                                      // 0 = use type and numComponents above
            const offset = 0;         // how many bytes inside the buffer to start from
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.position);
            this.gl.vertexAttribPointer(
                this.renderProgramInfo.attribLocations.vertexPosition,
                numComponents,
                type,
                normalize,
                stride,
                offset);
            this.gl.enableVertexAttribArray(
                this.renderProgramInfo.attribLocations.vertexPosition);
        }

        // Setup index buffer
        this.buffers.index = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.index);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(squareIndices), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

        // UV buffer
        this.buffers.uv = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.uv);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(squareUVs), gl.STATIC_DRAW);

        // From https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Using_textures_in_WebGL
        // tell webgl how to pull out the texture coordinates from buffer
        {
            const num = 2; // every coordinate composed of 2 values
            const type = gl.FLOAT; // the data in the buffer is 32 bit float
            const normalize = false; // don't normalize
            const stride = 0; // how many bytes to get from one set to the next
            const offset = 0; // how many bytes inside the buffer to start from
            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.uv);
            gl.vertexAttribPointer(this.renderProgramInfo.attribLocations.texCoord, num, type, normalize, stride, offset);
            gl.enableVertexAttribArray(this.renderProgramInfo.attribLocations.texCoord);
        }
        // ============================================
    }

    private swapBuffers() {
        const gl = this.gl;

        const temp = this.readBuffer;
        this.readBuffer = this.writeBuffer;
        this.writeBuffer = temp;

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer); 
        const attachmentPoint = gl.COLOR_ATTACHMENT0;
        gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, this.writeBuffer, 0);
    }

    // Not clear at this point if this will have to be smooshed up with update()
    protected draw(): void {
        const gl = this.gl;

        // This makes sure we are rendering to the canvas, not framebuffer
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, this.getCanvasWidth(), this.getCanvasHeight());
      
        // Clear the canvas before we start drawing on it.
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.useProgram(this.renderProgramInfo.program);

        // Bind the world texture so as to draw it on the quad
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.readBuffer);
        gl.uniform1i(this.renderProgramInfo.uniformLocations.uReadBuffer, 0);

        gl.clearColor(0.5,0.5,0.5,1);
        gl.clear(this.gl.COLOR_BUFFER_BIT);

        gl.clearDepth(1.0);                 // Clear everything
        gl.enable(gl.DEPTH_TEST);           // Enable depth testing
        gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.index);
        gl.drawElements(gl.TRIANGLES, this.buffers.indexCount, gl.UNSIGNED_SHORT, 0);
    }

    /**
     * Update the world texture on the GPU
     */
    protected update(): void {
        const gl = this.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);
        gl.viewport(0, 0, this.worldSize, this.worldSize);
        gl.useProgram(this.computeProgramInfo.program);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.readBuffer);
        gl.uniform1i(this.computeProgramInfo.uniformLocations.uReadBuffer, 0);

        // Drawing quad
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.index);
        gl.drawElements(gl.TRIANGLES, this.buffers.indexCount, gl.UNSIGNED_SHORT, 0);

        this.swapBuffers();
    }

    private writeBuffer: WebGLTexture;
    private readBuffer: WebGLTexture;

    private frameBuffer: WebGLFramebuffer;
    private renderProgramInfo: {
        program: WebGLProgram;
        attribLocations: {
            vertexPosition: number;
            texCoord: number;  
        };
        uniformLocations: {
            perspectiveMatrix: WebGLUniformLocation;
            modelViewMatrix: WebGLUniformLocation;
            uReadBuffer: WebGLUniformLocation;
        };
        vertexShaderSource: String;
        fragmentShaderSource: String;
    };
    private buffers: {
        position;
        positionCount: number;
        index;
        indexCount: number;
        uv;
        uvCount: number;
    };

    private computeProgramInfo: {
        program: WebGLProgram;
        attribLocations: {
            vertexPosition: number;
            texCoord: number;  
        };
        uniformLocations: {
            uReadBuffer: WebGLUniformLocation;
        };
        vertexShaderSource: String;
        fragmentShaderSource: String;
    };
}
