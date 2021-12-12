export function loadShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        let msg = 'An error occurred compiling the shader: ' + gl.getShaderInfoLog(shader);
        msg += '\n CODE: \n';
        const lines = source.split('\n');
        for (let l = 0; l < lines.length; ++l) {
            msg += (l + 1).toString() + "    " + lines[l] + '\n';
        }
        alert(msg);
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}
export function makeProgram(gl, vertexShaderSource, fragmentShaderSource) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(program));
        return null;
    }
    return program;
}
