//
// creates a shader of the given type, uploads the source and
// compiles it.
// From: https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Adding_2D_content_to_a_WebGL_context
//
export function loadShader(gl, type, source): WebGLShader {
  const shader = gl.createShader(type);

  // Send the source to the shader object

  gl.shaderSource(shader, source);

  // Compile the shader program

  gl.compileShader(shader);

  // See if it compiled successfully

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    let msg = 'An error occurred compiling the shader: ' + gl.getShaderInfoLog(shader);
    msg += '\n CODE: \n';
    const lines = source.split('\n');
    for(let l = 0; l < lines.length; ++l) {
      msg +=  (l+1).toString() +"    "+ lines[l] + '\n';
    }

    alert(msg);
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}


/**
 * Creates a program with a vertex and fragment shader
 */
export function makeProgram(gl, vertexShaderSource, fragmentShaderSource): WebGLProgram  {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

  // Create the shader program
  const program: WebGLProgram = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  // If creating the shader program failed, alert
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(program));
    return null;
  }
  return program;
}