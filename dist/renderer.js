import { MeshTemplate } from "./mesh_template.js";
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
        this.initBuffers();
        div.appendChild(this.canvas);
        this.rootElement = div;
    }
    getHTML() {
        return this.rootElement;
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
        this.meshTemplate = new MeshTemplate(this.gl, positions, indices);
    }
    render() {
        const gl = this.gl;
        gl.clearDepth(1.0);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        this.meshTemplate.render();
    }
}
