import {makeProgram} from './gl_helpers.js';
declare var mat4: any;

// A lot of this is taken/adapted from Mozilla's WebGL tutorials, particularly:
// https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Lighting_in_WebGL

export class VoxelMesh {
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
            gridSize: WebGLUniformLocation;
            spacing: WebGLUniformLocation;
            readBuffer: WebGLUniformLocation;
        },
        vertexShaderSource: String;
        fragmentShaderSource: String;
    };

    private vao: WebGLVertexArrayObject;

    private gl: WebGL2RenderingContext;
    private gridSize: number;
    private voxelSize: number;
    private gridSpacing: number;

    constructor(gl: WebGL2RenderingContext, gridSize: number, voxelSize: number, gridSpacing: number) {
        this.gridSize = gridSize;
        this.voxelSize = voxelSize;
        this.gridSpacing = gridSpacing;
        this.gl = gl;

        let buffers = this.initBuffers();
        let positions = buffers.positions;
        let indices = buffers.indices;
        let normals = buffers.normals;

        // ~~~~~~~~~~ Program ~~~~~~~~~~~
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

                // can this be lowp?
                out mediump vec3 normalInterp;
                out mediump vec3 vertPos;

                // 2D texture but represents 3D world
                uniform usampler2D uReadBuffer;

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
                        vec4 vertPos4 = uModelViewMatrix * vec4(
                            aVertexPosition + voxelOffset + 
                            vec3(gridOffset, gridOffset, gridOffset)
                            , 1
                        );
                        gl_Position = uPerspectiveMatrix * vertPos4;

                        highp vec3 ambientLight = vec3(0.3, 0.3, 0.3);
                        highp vec3 directionalLightColor = vec3(1, 1, 1);
                        highp vec3 directionalVector = normalize(vec3(0.85, 0.8, 0.75));
                        highp vec4 transformedNormal = uNormalMatrix * vec4(aVertexNormal, 1.0);
                        highp float directional = max(dot(transformedNormal.xyz, directionalVector), 0.0);
                        vLighting = ambientLight + (directionalLightColor * directional);
                        normalInterp = vec3(uNormalMatrix * vec4(aVertexNormal, 0.0));
                        vertPos = vec3(vertPos4) / vertPos4.w;
                    }
                    //
                }
           `,
            fragmentShaderSource: `#version 300 es
            // ---- VOXEL MESH FRAGMENT SHADER ----
                precision mediump float;
                // Don't think using this anymore?
                in highp vec3 vLighting;

                in mediump vec3 normalInterp;
                in mediump vec3 vertPos;
                
                const float Ka = 1.0; // Reflection coefficient
                const float Kd = 1.0; // Diffuse reflection coefficient
                const float Ks = 1.0; // Specular reflection coefficient
                const float shininessVal = 10.0;

                const vec3 ambientColor  = vec3(0.4, 0.5, 0.7);
                const vec3 diffuseColor  = vec3(0.2, 0.2, 0.7);
                const vec3 specularColor = vec3(1.0, 1.0, 1.0);
                const vec3 lightPos = vec3(400.0, 400.0, -203.0);

                out vec4 fragColor;

                void main() {
                    vec3 N = normalize(normalInterp);
                    vec3 L = normalize(lightPos - vertPos);

                    float lambertian = max(dot(N, L), 0.0);
                    float specular = 0.0;
                    if(lambertian > 0.0) {
                        vec3 R = reflect(-L, N);
                        vec3 V = normalize(-vertPos);
                        // Compute the specular term
                        float specAngle = max(dot(R, V), 0.0);
                        specular = pow(specAngle, shininessVal);
                    }
                    fragColor = vec4(
                        Ka * ambientColor +
                        Kd * lambertian * diffuseColor +
                        Ks * specular * specularColor, 
                        1.0
                    );

                    // fragColor = vec4(1.0, 1.0, 1.0, 1.0);
                    // fragColor = vec4(vLighting, 1);
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
        // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        

        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

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

        const indexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        this.gl.bufferData(
            this.gl.ELEMENT_ARRAY_BUFFER,
            new Uint16Array(indices),
            this.gl.STATIC_DRAW
        );

        // Unbind
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

    public render(modelViewMatrix, perspectiveMatrix, cellDataTexture: WebGLTexture) {
        const programInfo = this.programInfo;
        const buffers = this.buffers;
        const gl = this.gl;

        gl.useProgram(programInfo.program);

        const normalMatrix = mat4.create();
        mat4.invert(normalMatrix, modelViewMatrix);
        mat4.transpose(normalMatrix, normalMatrix);
        
        // mat4.scale(scaledModelMatrix, modelViewMatrix, [this.voxelSize, this.voxelSize, this.voxelSize]);

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

        gl.uniform1i(
            programInfo.uniformLocations.gridSize, 
            this.gridSize);

        gl.uniform1f(programInfo.uniformLocations.spacing,
            this.gridSpacing);
        
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, cellDataTexture);
        gl.uniform1i(this.programInfo.uniformLocations.readBuffer, 0);

        gl.bindVertexArray(this.vao);
        {
            const offset = 0;
            // gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
            // gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.index);
            const instanceCount = this.gridSize ** 3;
            gl.drawElementsInstanced(gl.TRIANGLES, buffers.indexCount, gl.UNSIGNED_SHORT, offset, instanceCount);
        }
        gl.bindVertexArray(null);
    }

    private initBuffers(): {positions: number[], indices: number[], normals: number[]} {
        // An array of positions for the cube.
        // Cube positions and indices are courtesy of
        // Mozilla: https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Creating_3D_objects_using_WebGL
        const positions = [
            // Front face
            -0.5, -0.5,  0.5,
             0.5, -0.5,  0.5,
             0.5,  0.5,  0.5,
            -0.5,  0.5,  0.5,
          
            // Back face
            -0.5, -0.5, -0.5,
            -0.5,  0.5, -0.5,
             0.5,  0.5, -0.5,
             0.5, -0.5, -0.5,
          
            // Top face
            -0.5,  0.5, -0.5,
            -0.5,  0.5,  0.5,
             0.5,  0.5,  0.5,
             0.5,  0.5, -0.5,
          
            // Bottom face
            -0.5, -0.5, -0.5,
             0.5, -0.5, -0.5,
             0.5, -0.5,  0.5,
            -0.5, -0.5,  0.5,
          
            // Right face
             0.5, -0.5, -0.5,
             0.5,  0.5, -0.5,
             0.5,  0.5,  0.5,
             0.5, -0.5,  0.5,
          
            // Left face
            -0.5, -0.5, -0.5,
            -0.5, -0.5,  0.5,
            -0.5,  0.5,  0.5,
            -0.5,  0.5, -0.5,
        ];

        for(let i = 0; i < positions.length; ++i) {
            positions[i] *= this.voxelSize;
        }
          
        const indices = [
            0,  1,  2,      0,  2,  3,    // front
            4,  5,  6,      4,  6,  7,    // back
            8,  9,  10,     8,  10, 11,   // top
            12, 13, 14,     12, 14, 15,   // bottom
            16, 17, 18,     16, 18, 19,   // right
            20, 21, 22,     20, 22, 23,   // left
        ];

        const vertexNormals = [
            // Front
             0.0,  0.0,  1.0,
             0.0,  0.0,  1.0,
             0.0,  0.0,  1.0,
             0.0,  0.0,  1.0,
        
            // Back
             0.0,  0.0, -1.0,
             0.0,  0.0, -1.0,
             0.0,  0.0, -1.0,
             0.0,  0.0, -1.0,
        
            // Top
             0.0,  1.0,  0.0,
             0.0,  1.0,  0.0,
             0.0,  1.0,  0.0,
             0.0,  1.0,  0.0,
        
            // Bottom
             0.0, -1.0,  0.0,
             0.0, -1.0,  0.0,
             0.0, -1.0,  0.0,
             0.0, -1.0,  0.0,
        
            // Right
             1.0,  0.0,  0.0,
             1.0,  0.0,  0.0,
             1.0,  0.0,  0.0,
             1.0,  0.0,  0.0,
        
            // Left
            -1.0,  0.0,  0.0,
            -1.0,  0.0,  0.0,
            -1.0,  0.0,  0.0,
            -1.0,  0.0,  0.0
        ];

        return{positions, indices, normals: vertexNormals};
    }
}