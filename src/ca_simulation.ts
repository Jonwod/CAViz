import { CellularAutomaton } from "./cellular_automaton.js";
import { Configuration } from "./configuration";
import { assert } from "./assert.js";
import { Camera } from "./camera.js";
import { makeProgram } from "./gl_helpers.js";
import { Renderer } from "./renderer.js";


export function createSimulation(ca: CellularAutomaton,
                                 initialConfiguration: Configuration): CASimulation {
    if(ca.getNumDimensions() === 2) {
        return new CASimulation2D(ca, initialConfiguration);
    } else {
        assert(false, "TODO: Implement for dimensions  !=2");
    }
}

// TODO: Fill this out

/**
 * A simulation of a particular Cellular Automaton, from the given start
 * configuration. Will automatically implement it to run on the GPU, if
 * possible.
 */
export abstract class CASimulation {
    private rootElement: HTMLElement;
    private canvas: HTMLCanvasElement;
    protected gl: WebGLRenderingContext;

    constructor(ca: CellularAutomaton, initialConfiguration: Configuration, width: number, height: number) {
        let div = document.createElement("div");
        this.canvas = document.createElement("canvas");
        this.canvas.width = width;
        this.canvas.height = height;
        this.gl = this.canvas.getContext("webgl2"); // NOTE WebGL 2. Make sure this works.
        if(this.gl === null) {
            alert("Unable to initialize WebGL. Your browser or machine may not support it.");
            return null;
        }

        this.gl.clearColor(0,0,0,1);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        div.appendChild(this.canvas);

        this.rootElement = div;
    }

    public getHTML(): HTMLElement {
        return this.rootElement;
    }

    /**
     * Will run indefinitely in it's own loop, updating the canvas
     * This function should be non-blocking
     */
    public abstract run(): void;
}


class CASimulation2D extends CASimulation {
    constructor(ca: CellularAutomaton, initialConfiguration: Configuration) {
        // Used https://webglfundamentals.org/webgl/lessons/webgl-render-to-texture.html
        // for reference on frame buffers and rendering to a texture.
        super(ca, initialConfiguration, 800, 800);
        const gl = this.gl;

        const worldSize = 512;
        this.worldTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.worldTexture);

        {
            const level = 0;
            // TODO: change this to one channel 'ALPHA'?
            const internalFormat = gl.RGBA;
            const border = 0;
            const format = gl.RGBA;
            const type = gl.UNSIGNED_BYTE;
            const data = null;
            gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                worldSize, worldSize, border,
                format, type, data);

            // set the filtering so we don't need mips
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

            // Create and bind the framebuffer
            // After binding the framebuffer, draw calls will draw to it
            const fb = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, fb); 
            
            // attach the texture as the first color attachment
            const attachmentPoint = gl.COLOR_ATTACHMENT0;
            gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, this.worldTexture, level);
        }
          
        this.programInfo = {
            program: null,
            attribLocations: null,
            uniformLocations: null,
            vertexShaderSource: `
                attribute vec4 aVertexPosition;
            
                void main() {
                    gl_Position = aVertexPosition;
                }
        `,
        fragmentShaderSource: `
            void main() {
                gl_FragColor = vec4(0.0, 0.5, 0.5, 1.0);
            }
        `,
        }; 

        // ++++++++++++++++ PROGRAM ++++++++++++++++++++
        this.programInfo.program = makeProgram(gl, this.programInfo.vertexShaderSource, this.programInfo.fragmentShaderSource);
              
        this.programInfo.attribLocations = {
            vertexPosition: this.gl.getAttribLocation(this.programInfo.program, 'aVertexPosition')
        };
        // this.programInfo.uniformLocations = {
        //     perspectiveMatrix: this.gl.getUniformLocation(this.programInfo.program, 'uPerspectiveMatrix'),
        //     modelViewMatrix: this.gl.getUniformLocation(this.programInfo.program, 'uModelViewMatrix')
        // };
        // +++++++++++++++++++++++++++++++++++++++++++++

        // ================== DATA =====================
        const squareVerts = [
            -0.5, 0.5, -.5, // tl
            -0.5,-0.5,-.5,  // bl
            0.5,-0.5,-.5,   // br
            0.5, 0.5, -.5   // tr
        ];
        const squareIndices = [0,1,2,0,2,3];
        this.buffers = {
            position: null,
            positionCount: squareVerts.length,
            index: null,
            indexCount: squareIndices.length
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
                this.programInfo.attribLocations.vertexPosition,
                numComponents,
                type,
                normalize,
                stride,
                offset);
            this.gl.enableVertexAttribArray(
                this.programInfo.attribLocations.vertexPosition);
        }

        // Setup index buffer
        this.buffers.index = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.index);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(squareIndices), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
        // ============================================
    }

    public run(): void {
        // hz
        const drawRate = 60.0;
        const caUpdateRate = 5.0;
        let lastDrawStamp, lastCaUpdateStamp;
        let that = this;

        function tick(timestamp) {
            if (lastDrawStamp === undefined)
                lastDrawStamp = timestamp;
            if(lastCaUpdateStamp === undefined)
                lastCaUpdateStamp = timestamp;
            const timeSinceDraw = timestamp - lastDrawStamp;

            if ( (timeSinceDraw/1000.0) >= (1.0/drawRate) ) {        
                // Do the rendering here
                that.render();
                lastDrawStamp = timestamp;
            }

            const timeSinceCaUpdate = timestamp - lastCaUpdateStamp;
            if( (timeSinceCaUpdate/1000.0) >= (1.0/caUpdateRate) ) {
                that.update();
                lastCaUpdateStamp = timestamp;
            }

            window.requestAnimationFrame(tick);
        }
        window.requestAnimationFrame(tick);
    }

    // Not clear at this point if this will have to be smooshed up with update()
    private render() {
        const gl = this.gl;

        // This makes sure we are rendering to the canvas, not framebuffer
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        gl.clearColor(0,0,0,1);
        gl.clear(this.gl.COLOR_BUFFER_BIT);

        gl.clearDepth(1.0);                 // Clear everything
        gl.enable(gl.DEPTH_TEST);           // Enable depth testing
        gl.depthFunc(gl.LEQUAL);            // Near things obscure far things
      
        // Clear the canvas before we start drawing on it.
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.useProgram(this.programInfo.program);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.index);
        gl.drawElements(gl.TRIANGLES, this.buffers.indexCount, gl.UNSIGNED_SHORT,0);
    }

    private update() {

    }

    private worldTexture: WebGLTexture;
    private programInfo: {
        program: WebGLProgram;
        attribLocations: {
            vertexPosition: number;
        };
        uniformLocations: {
            perspectiveMatrix: WebGLUniformLocation;
            modelViewMatrix: WebGLUniformLocation;
        },
        vertexShaderSource: String;
        fragmentShaderSource: String;
    };
    private buffers: {
        position;
        positionCount: number;
        index;
        indexCount: number;
    };
}