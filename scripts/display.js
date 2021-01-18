/* global define */
define('scripts/display', [
  'libs/gl-matrix-min.js',
  'text!shaders/display/bird.frag',
  'text!shaders/display/bird.vert',
], function(
  glMatrix,
  BirdFragmentShader,
  BirdVertexShader,
) {
  'use strict';

  const { mat4 } = glMatrix;

  return class FlockingDisplay {
    constructor(canvas) {
      this.canvas = canvas;
      this.gl = canvas.getContext('webgl2');
    }

    static loadShader(gl, type, source) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);

      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert('An error occured compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }

      return shader;
    }

    setAgentCount(count) {
      this.vertex_count = count;
    }

    resizeViewport() {
      const gl = this.gl;

      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    initBirdShaderProgram() {
      const gl = this.gl;

      const vertexShader = FlockingDisplay.loadShader(gl, gl.VERTEX_SHADER, BirdVertexShader);
      const fragmentShader = FlockingDisplay.loadShader(gl, gl.FRAGMENT_SHADER, BirdFragmentShader);

      const shaderProgram = gl.createProgram();
      gl.attachShader(shaderProgram, vertexShader);
      gl.attachShader(shaderProgram, fragmentShader);
      gl.linkProgram(shaderProgram);

      if(!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
        this.bird_shader_program = null;
      }

      this.bird_shader_program = shaderProgram;

      this.program_info = {
        program: this.bird_shader_program,
        attribLocations: {
          vertexPosition: gl.getAttribLocation(this.bird_shader_program, 'aVertexPosition'),
        },
      };
    }

    initBuffers() {
      const gl = this.gl;

      const positionBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(64 * 64 * 4), gl.DYNAMIC_DRAW);

      this.position_buffer = positionBuffer;
    }

    updatePositionBuffer(positions) {
      const gl = this.gl;

      this.position_buffer = gl.createBuffer();

      gl.bindBuffer(gl.ARRAY_BUFFER, this.position_buffer);
      gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);
    }

    drawScene() {
      const gl = this.gl;

      gl.clearColor(1.0, 1.0, 1.0, 1.0);
      gl.clearDepth(1.0);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);

      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      {
        const numComponents = 4;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;

        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.position_buffer);
        gl.vertexAttribPointer(
          this.program_info.attribLocations.vertexPosition,
          numComponents,
          type,
          normalize,
          stride,
          offset,
        );
        gl.enableVertexAttribArray(this.program_info.attribLocations.vertexPosition);
      }

      gl.useProgram(this.program_info.program);

      {
        const offset = 0;
        gl.drawArrays(gl.POINTS, offset, this.vertex_count);
      }
    }
  };
});
