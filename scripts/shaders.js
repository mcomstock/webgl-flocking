/* global define */
define('scripts/shaders', [
  'libs/gl-matrix-min',
  'text!shaders/copy.frag',
  'text!shaders/copy_uint.frag',
  'text!shaders/default.vert',
  'text!shaders/find_neighbors.frag',
  'text!shaders/predict_movement.frag',
  'text!shaders/update_acceleration.frag',
  'text!shaders/update_acceleration_2.frag',
  'text!shaders/update_acceleration_3.frag',
  'text!shaders/reynolds_acceleration.frag',
  'text!shaders/update_velocity.frag',
  'text!shaders/update_agent.frag',
  'text!shaders/check_collisions.frag',
  'text!shaders/display/model.vert',
  'text!shaders/display/model.frag',
  'text!shaders/random/pcg.frag',
], function(
  GLMatrix,
  CopyShader,
  CopyUintShader,
  DefaultVertexShader,
  FindNeighborsShader,
  PredictMovementShader,
  UpdateAccelerationShader,
  UpdateAccelerationShader2,
  UpdateAccelerationShader3,
  ReynoldsAccelerationShader,
  UpdateVelocityShader,
  UpdateAgentShader,
  CheckCollisionsShader,
  ModelVertexShader,
  ModelFragmentShader,
  RandomShader,
) {
  'use strict';

  const { mat4 } = GLMatrix;

  return class FlockingShaders {
    constructor(flocking_interface) {
      this.flocking_interface = flocking_interface;

      this.region_width = 75;
      this.region_height = 75;
      this.region_depth = 75;
      // this.region_width = 25;
      // this.region_height = 25;
      // this.region_depth = 25;

      // Shader code depends on these specific values
      this.agent_width = 64;
      this.agent_height = 64;

      this.predator_position = [0, 0, 0];
      this.predator_active = 0;

      this.canvas = document.createElement('canvas');
      this.canvas.width = this.agent_width;
      this.canvas.height = this.agent_height;

      this.gl = this.canvas.getContext('webgl2');
      this.gl.getExtension('EXT_color_buffer_float');
      this.gl.getExtension('OES_texture_float_linear');

      this.context = flocking_interface.display_canvas.getContext('2d');
    }

    loadShader(type, source) {
      const gl = this.gl;

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

    loadFloatTexture(width, height, values) {
      const gl = this.gl;

      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);

      const level = 0;
      const internalFormat = gl.RGBA32F;
      const border = 0;
      const format = gl.RGBA;
      const type = gl.FLOAT;

      gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, width, height, border, format, type, values);

      gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      gl.bindTexture(gl.TEXTURE_2D, null);

      return texture;
    }

    loadUintTexture(width, height, values) {
      const gl = this.gl;

      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);

      const level = 0;
      const internalFormat = gl.RGBA32UI;
      const border = 0;
      const format = gl.RGBA_INTEGER;
      const type = gl.UNSIGNED_INT;

      gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, width, height, border, format, type, values);

      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      gl.bindTexture(gl.TEXTURE_2D, null);

      return texture;
    }

    loadShaderProgram(vertexShaderSource, fragmentShaderSource) {
      const gl = this.gl;

      const vertexShader = this.loadShader(gl.VERTEX_SHADER, vertexShaderSource);
      const fragmentShader = this.loadShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

      const shaderProgram = gl.createProgram();
      gl.attachShader(shaderProgram, vertexShader);
      gl.attachShader(shaderProgram, fragmentShader);
      gl.linkProgram(shaderProgram);

      if(!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
        return null;
      }

      return shaderProgram;
    }

    // Use the Box-Muller transform to get a normal distribution from the built-in JS uniform
    // distribution.
    randNorm(mean, stdev) {
      let u = 0;
      let v = 0;

      // Make sure u,v are in (0,1) rather than [0,1)
      while (u === 0) {
        u = Math.random();
      }

      while (v === 0) {
        v = Math.random();
      }

      return stdev * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v) + mean;
    }

    initializeAgents() {
      const max_agents = this.agent_width * this.agent_height;
      const agent_array = new Float32Array(max_agents * 4);
      const velocity_array = new Float32Array(max_agents * 4);

      let p = 0;
      for (let i = 0; i < max_agents; ++i) {
        agent_array[p] = Math.random() * this.region_width;
        velocity_array[p++] = (Math.random() - 0.5) * 4.0;

        // agent_array[p] = Math.random() * this.region_height;
        agent_array[p] = this.randNorm(this.region_height/2, this.region_height/8);
        velocity_array[p++] = (Math.random() - 0.5) * 4.0;

        agent_array[p] = Math.random() * this.region_depth;
        // agent_array[p] = this.randNorm(this.region_width/2, this.region_width/8);
        velocity_array[p++] = (Math.random() - 0.5) * 4.0;

        agent_array[p] = 0.0;
        velocity_array[p++] = 0.0;

        // agent_array[p] = Math.random() * this.region_width;
        // velocity_array[p++] = Math.random() * 4.0;

        // agent_array[p] = Math.random() * this.region_height;
        // velocity_array[p++] = Math.random() * 4.0;

        // agent_array[p] = Math.random() * this.region_depth;
        // velocity_array[p++] = Math.random() * 4.0;

        // agent_array[p] = 0.0;
        // velocity_array[p++] = 0.0;

        // agent_array[p] = Math.random() * this.region_width;
        // velocity_array[p++] = (Math.random() - 0.5) * 4.0;

        // agent_array[p] = Math.random() * this.region_height;
        // velocity_array[p++] = (Math.random() - 0.5) * 4.0;

        // agent_array[p] = 0.5 * this.region_depth;
        // velocity_array[p++] = 0.0;

        // agent_array[p] = 0.0;
        // velocity_array[p++] = 0.0;

        // agent_array[p] = 0.25*this.region_width + Math.random() * 0.5*this.region_width;
        // velocity_array[p++] = 3.0 + 0.2*Math.random();

        // agent_array[p] = 0.25*this.region_width + Math.random() * 0.5*this.region_height;
        // velocity_array[p++] = 3.0 + 0.2*Math.random();

        // agent_array[p] = 0.5 * this.region_depth;
        // velocity_array[p++] = 0.0;

        // agent_array[p] = 0.0;
        // velocity_array[p++] = 0.0;

        // agent_array[p] = Math.random() * this.region_width;
        // velocity_array[p++] = 1.0 + 0.2*Math.random() / 4;

        // agent_array[p] = Math.random() * this.region_height / 4;
        // velocity_array[p++] = 1.0 + 0.2*Math.random();

        // agent_array[p] = Math.random() * this.region_depth / 4;
        // velocity_array[p++] = 1.0 + 0.2*Math.random();

        // agent_array[p] = 0.0;
        // velocity_array[p++] = 0.0;

        // agent_array[p] = i;
        // velocity_array[p++] = 1.0;

        // agent_array[p] = 0.5 * this.region_height;
        // velocity_array[p++] = 0;

        // agent_array[p] = 0.5 * this.region_depth;
        // velocity_array[p++] = 0;

        // agent_array[p] = 0;
        // velocity_array[p++] = 0;

        // agent_array[p] = (i % 3);
        // velocity_array[p++] = 1.0;

        // agent_array[p] = 1 + Math.floor(i / 3);
        // velocity_array[p++] = 0;

        // agent_array[p] = 0.5 * this.region_depth;
        // velocity_array[p++] = 0;

        // agent_array[p] = 0;
        // velocity_array[p++] = 0;
      }

      return [ agent_array, velocity_array ];
    }

    initializeRandomState() {
      const get_random_int = () => Math.floor(Math.random() * 4294967295);

      const num_entries = this.agent_width * this.agent_height * 4;
      const random_state = new Uint32Array(num_entries);

      for (let i = 0; i < num_entries; ++i) {
        random_state[i] = get_random_int();
      }

      return random_state;
    }

    createAgentTextures() {
      const [agent_array, velocity_array] = this.initializeAgents();
      const random_state = this.initializeRandomState();

      this.position_texture = this.loadFloatTexture(this.agent_width, this.agent_height, agent_array);
      this.position_out_texture = this.loadFloatTexture(this.agent_width, this.agent_height, null);

      this.predicted_position_texture = this.loadFloatTexture(this.agent_width, this.agent_height, null);

      this.velocity_texture = this.loadFloatTexture(this.agent_width, this.agent_height, velocity_array);
      this.velocity_out_texture = this.loadFloatTexture(this.agent_width, this.agent_height, null);

      this.acceleration_texture = this.loadFloatTexture(this.agent_width, this.agent_height, null);

      this.collision_texture = this.loadFloatTexture(this.agent_width, this.agent_height, null);

      this.random_state_in = this.loadUintTexture(this.agent_width, this.agent_height, random_state);
      this.random_state_out = this.loadUintTexture(this.agent_width, this.agent_height, null);
      this.random_value = this.loadFloatTexture(this.agent_width, this.agent_height, null);
    }

    createNeighborTextures() {
      this.neighbor_texture_0 = this.loadUintTexture(this.agent_width, this.agent_height, null);
      this.neighbor_texture_1 = this.loadUintTexture(this.agent_width, this.agent_height, null);
    }

    attachTextures(framebuffer, textures) {
      const gl = this.gl;

      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, framebuffer);

      const draw_buffers = [];

      for (let i = 0; i < textures.length; ++i) {
        gl.framebufferTexture2D(
          gl.DRAW_FRAMEBUFFER,
          gl['COLOR_ATTACHMENT' + i],
          gl.TEXTURE_2D,
          textures[i],
          0,
        );

        draw_buffers.push(gl['COLOR_ATTACHMENT' + i]);
      }

      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);

      return draw_buffers;
    }

    initDefaultVertexBuffer() {
      const gl = this.gl;

      const vertex_array = new Float32Array([
        1, 1, 0,
        0, 1, 0,
        1, 0, 0,
        0, 0, 0,
      ]);

      const vertex_buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertex_array, gl.STATIC_DRAW, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, null);

      this.default_vertex_buffer = vertex_buffer;
    }

    initDisplayVertexBuffer() {
      const gl = this.gl;

      const vertices = [];
      for (let i = 0; i < this.agent_width; ++i) {
        for (let j = 0; j < this.agent_height; ++j) {
          const x = (i+0.5) / this.agent_width;
          const y = (j+0.5) / this.agent_height;

          for (let k = 0; k < 12; ++k) {
            vertices.push(y);
            vertices.push(x);
            vertices.push(k);
          }
        }
      }

      const vertex_array = new Float32Array(vertices);

      const vertex_buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertex_array, gl.STATIC_DRAW, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, null);

      this.display_vertex_buffer = vertex_buffer;
    }

    useDefaultVertexBuffer(program) {
      const gl = this.gl;

      gl.bindBuffer(gl.ARRAY_BUFFER, this.default_vertex_buffer);

      const vertex_loc = gl.getAttribLocation(program, 'position');
      const numComponents = 3;
      const type = gl.FLOAT;
      const normalize = false;
      const stride = 0;
      const offset = 0;

      // The array buffer must be bound from earlier
      gl.vertexAttribPointer(
        vertex_loc,
        numComponents,
        type,
        normalize,
        stride,
        offset,
      );

      gl.enableVertexAttribArray(vertex_loc);

      gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

    useDisplayVertexBuffer(program) {
      const gl = this.gl;

      gl.bindBuffer(gl.ARRAY_BUFFER, this.display_vertex_buffer);

      const vertex_loc = gl.getAttribLocation(program, 'position');
      const numComponents = 3;
      const type = gl.FLOAT;
      const normalize = false;
      const stride = 0;
      const offset = 0;

      gl.vertexAttribPointer(
        vertex_loc,
        numComponents,
        type,
        normalize,
        stride,
        offset,
      );

      gl.enableVertexAttribArray(vertex_loc);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

    getUintTextureArray(texture, array) {
      const gl = this.gl;

      const framebuffer = gl.createFramebuffer();

      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(gl.READ_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      gl.readBuffer(gl.COLOR_ATTACHMENT0);

      gl.readPixels(0, 0, this.agent_width, this.agent_height, gl.RGBA_INTEGER, gl.UNSIGNED_INT, array);

      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
    }

    getFloatTextureArray(texture, array) {
      const gl = this.gl;

      const framebuffer = gl.createFramebuffer();

      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(gl.READ_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      gl.readBuffer(gl.COLOR_ATTACHMENT0);

      gl.readPixels(0, 0, this.agent_width, this.agent_height, gl.RGBA, gl.FLOAT, array);

      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
    }

    runProgram(program_info) {
      const gl = this.gl;

      const { framebuffer, program, uniform_locations, set_uniforms, out_textures } = program_info;
      gl.useProgram(program);
      set_uniforms(uniform_locations);

      const draw_buffers = this.attachTextures(framebuffer, out_textures);

      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, framebuffer);
      gl.drawBuffers(draw_buffers);

      this.useDefaultVertexBuffer(program);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    }

    // Returns a matrix that transforms the region as if viewed by the eye, so that farther away
    // objects appear smaller. The size is proportional to 1/-z, rather than linear, which is
    // conventional.
    getProjectionMatrix(fov, near, far) {
      const f = Math.tan(Math.PI * 0.5 - 0.5 * fov);
      const rangeinv = 1.0 / (near - far);

      return mat4.fromValues(
        f, 0, 0, 0,
        0, f, 0, 0,
        0, 0, (near + far) * rangeinv, -1,
        0, 0, near * far * rangeinv * 2, 0,
      );
    }

    // Returns a matrix that moves the region to the space in front of the camera.
    getViewMatrix() {
      return mat4.fromValues(
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, -1, 0,
        -0.5*this.region_width, -0.5*this.region_height, 0, 1,
      );
    }

    runDisplay(display_info) {
      const gl = this.gl;

      const old_width = this.canvas.width;
      const old_height = this.canvas.height;

      this.canvas.width = this.flocking_interface.display_canvas.width;
      this.canvas.height = this.flocking_interface.display_canvas.height;

      gl.viewport(0, 0, this.canvas.width, this.canvas.height);

      // If near = 0 then the depth test doesn't work. Why?
      const projection_matrix = this.getProjectionMatrix(1.5*Math.PI, 1, this.region_depth);
      const view_matrix = this.getViewMatrix();
      const view_projection_matrix = mat4.create();
      mat4.multiply(view_projection_matrix, projection_matrix, view_matrix);

      const { program, uniform_locations, set_uniforms } = display_info;
      gl.useProgram(program);
      set_uniforms(uniform_locations, view_projection_matrix);

      gl.clearColor(1.0, 1.0, 1.0, 1.0);
      gl.clearDepth(1.0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      gl.enable(gl.DEPTH_TEST);
      gl.enable(gl.CULL_FACE);
      gl.depthFunc(gl.LEQUAL);

      this.useDisplayVertexBuffer(program);

      const offset = 0;
      const vertex_count = this.flocking_interface.number_agents.value * 12;
      gl.drawArrays(gl.TRIANGLES, offset, vertex_count);

      this.context.drawImage(gl.canvas, 0, 0, this.flocking_interface.display_canvas.width, this.flocking_interface.display_canvas.height);

      this.canvas.width = old_width;
      this.canvas.height = old_height;

      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    setupDisplay() {
      const gl = this.gl;

      const info = {};

      const uniforms = ['position_texture', 'velocity_texture', 'u_matrix'];

      info.program = this.loadShaderProgram(ModelVertexShader, ModelFragmentShader);
      gl.useProgram(info.program);

      info.uniform_locations = uniforms.map(u => gl.getUniformLocation(info.program, u));
      info.set_uniforms = (uniform_locations, u_matrix) => {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.position_texture);
        gl.uniform1i(uniform_locations[0], 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.velocity_texture);
        gl.uniform1i(uniform_locations[1], 1);

        gl.uniformMatrix4fv(uniform_locations[2], false, u_matrix);
      };

      return info;
    }

    setupDefault(fragmentShaderSource, uniforms, out_textures, set_uniforms) {
      const gl = this.gl;

      const info = {};

      info.framebuffer = gl.createFramebuffer();
      info.program = this.loadShaderProgram(DefaultVertexShader, fragmentShaderSource);
      gl.useProgram(info.program);

      info.uniform_locations = uniforms.map(u => gl.getUniformLocation(info.program, u));

      info.out_textures = out_textures;
      info.set_uniforms = set_uniforms;

      return info;
    }

    setupRandom() {
      const gl = this.gl;

      const uniforms = ['random_state_in'];
      const out_textures = [this.random_state_out, this.random_value];
      const set_uniforms = (uniform_locations) => {
        const gl = this.gl;

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.random_state_in);
        gl.uniform1i(uniform_locations[0], 0);
      };

      return this.setupDefault(RandomShader, uniforms, out_textures, set_uniforms);
    }

    setupCopyRandom() {
      const gl = this.gl;

      const uniforms = ['original'];
      const out_textures = [this.random_state_in];

      const set_uniforms = (uniform_locations) => {
        const gl = this.gl;

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.random_state_out);
        gl.uniform1i(uniform_locations[0], 0);
      };

      return this.setupDefault(CopyUintShader, uniforms, out_textures, set_uniforms);
    }

    setupNeighbors() {
      const gl = this.gl;

      const uniforms = ['num_agents', 'neighbor_radius', 'agent_texture'];
      const out_textures = [this.neighbor_texture_0, this.neighbor_texture_1];
      const set_uniforms = (uniform_locations) => {
        const gl = this.gl;

        gl.uniform1i(uniform_locations[0], this.flocking_interface.number_agents.value);
        gl.uniform1f(uniform_locations[1], this.flocking_interface.neighbor_radius.value);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.position_texture);
        gl.uniform1i(uniform_locations[2], 0);
      };

      return this.setupDefault(FindNeighborsShader, uniforms, out_textures, set_uniforms);
    }

    setupPredictMovement() {
      const gl = this.gl;

      const uniforms = ['agent_texture', 'velocity_texture', 'dt'];
      const out_textures = [this.predicted_position_texture];
      const set_uniforms = (uniform_locations) => {
        const gl = this.gl;

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.position_texture);
        gl.uniform1i(uniform_locations[0], 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.velocity_texture);
        gl.uniform1i(uniform_locations[1], 1);

        gl.uniform1f(uniform_locations[2], this.flocking_interface.dt.value);
      };

      return this.setupDefault(PredictMovementShader, uniforms, out_textures, set_uniforms);
    }

    setupUpdateAcceleration() {
      const gl = this.gl;

      const uniforms = [
        'predicted_position_texture',
        'neighbor_texture_0',
        'neighbor_texture_1',
        'num_agents',
        'region_width',
        'region_height',
        'region_depth',
        'dt',
        'abar',
        'eta',
        'lambda',
        'omega',
        'center_pull',
        'log_attraction',
        'predator_constant',
        'predator_active',
        'predator_position',
        'neighbor_count',
        'cohesion',
        'velocity_texture',
        'alignment',
        'vertical_cost',
      ];

      const out_textures = [this.acceleration_texture];

      const set_uniforms = (uniform_locations) => {
        const gl = this.gl;

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.position_texture);
        gl.uniform1i(uniform_locations[0], 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.neighbor_texture_0);
        gl.uniform1i(uniform_locations[1], 1);

        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, this.neighbor_texture_1);
        gl.uniform1i(uniform_locations[2], 2);

        gl.uniform1i(uniform_locations[3], this.flocking_interface.number_agents.value);
        gl.uniform1f(uniform_locations[4], this.region_width);
        gl.uniform1f(uniform_locations[5], this.region_height);
        gl.uniform1f(uniform_locations[6], this.region_depth);
        gl.uniform1f(uniform_locations[7], this.flocking_interface.dt.value);
        gl.uniform1f(uniform_locations[8], this.flocking_interface.abar.value);
        gl.uniform1f(uniform_locations[9], this.flocking_interface.eta.value);
        gl.uniform1f(uniform_locations[10], this.flocking_interface.lambda.value);
        gl.uniform1f(uniform_locations[11], this.flocking_interface.omega.value);
        gl.uniform1f(uniform_locations[12], this.flocking_interface.center.value);
        gl.uniform1f(uniform_locations[13], this.flocking_interface.log_attraction.checked ? 1.0 : 0.0);
        gl.uniform1f(uniform_locations[14], this.flocking_interface.predator_constant.value);
        gl.uniform1i(uniform_locations[15], this.predator_active);
        gl.uniform3fv(uniform_locations[16], this.predator_position);
        gl.uniform1i(uniform_locations[17], this.flocking_interface.neighbor_count.value);
        gl.uniform1f(uniform_locations[18], this.flocking_interface.cohesion.value);

        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, this.velocity_texture);
        gl.uniform1i(uniform_locations[19], 3);

        gl.uniform1f(uniform_locations[20], this.flocking_interface.alignment.value);
        gl.uniform1f(uniform_locations[21], this.flocking_interface.vertical_cost.value);
      };

      return this.setupDefault(UpdateAccelerationShader, uniforms, out_textures, set_uniforms);
    }

    setupUpdateAcceleration2() {
      const gl = this.gl;

      const uniforms = [
        'position_texture',
        'neighbor_texture_0',
        'neighbor_texture_1',
        'num_agents',
        'region_width',
        'region_height',
        'region_depth',
        'dt',
        'abar',
        'eta',
        'lambda',
        'omega',
        'center_pull',
        'log_attraction',
        'predator_constant',
        'predator_active',
        'predator_position',
        'neighbor_count',
        'cohesion',
        'velocity_texture',
        'alignment',
      ];

      const out_textures = [this.acceleration_texture];

      const set_uniforms = (uniform_locations) => {
        const gl = this.gl;

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.position_texture);
        gl.uniform1i(uniform_locations[0], 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.neighbor_texture_0);
        gl.uniform1i(uniform_locations[1], 1);

        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, this.neighbor_texture_1);
        gl.uniform1i(uniform_locations[2], 2);

        gl.uniform1i(uniform_locations[3], this.flocking_interface.number_agents.value);
        gl.uniform1f(uniform_locations[4], this.region_width);
        gl.uniform1f(uniform_locations[5], this.region_height);
        gl.uniform1f(uniform_locations[6], this.region_depth);
        gl.uniform1f(uniform_locations[7], this.flocking_interface.dt.value);
        gl.uniform1f(uniform_locations[8], this.flocking_interface.abar.value);
        gl.uniform1f(uniform_locations[9], this.flocking_interface.eta.value);
        gl.uniform1f(uniform_locations[10], this.flocking_interface.lambda.value);
        gl.uniform1f(uniform_locations[11], this.flocking_interface.omega.value);
        gl.uniform1f(uniform_locations[12], this.flocking_interface.center.value);
        gl.uniform1f(uniform_locations[13], this.flocking_interface.log_attraction.checked ? 1.0 : 0.0);
        gl.uniform1f(uniform_locations[14], this.flocking_interface.predator_constant.value);
        gl.uniform1i(uniform_locations[15], this.predator_active);
        gl.uniform3fv(uniform_locations[16], this.predator_position);
        gl.uniform1i(uniform_locations[17], this.flocking_interface.neighbor_count.value);
        gl.uniform1f(uniform_locations[18], this.flocking_interface.cohesion.value);

        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, this.velocity_texture);
        gl.uniform1i(uniform_locations[19], 3);

        gl.uniform1f(uniform_locations[20], this.flocking_interface.alignment.value);
      };

      return this.setupDefault(UpdateAccelerationShader2, uniforms, out_textures, set_uniforms);
    }

    setupUpdateAcceleration3() {
      const gl = this.gl;

      const uniforms = [
        'position_texture',
        'neighbor_texture_0',
        'neighbor_texture_1',
        'num_agents',
        'region_width',
        'region_height',
        'region_depth',
        'dt',
        'abar',
        'eta',
        'lambda',
        'omega',
        'center_pull',
        'log_attraction',
        'predator_constant',
        'predator_active',
        'predator_position',
        'neighbor_count',
        'cohesion',
        'velocity_texture',
        'alignment',
        'epsilon_par',
        'sigma_par',
        'alpha_par',
        'epsilon_perp',
        'sigma_perp',
        'alpha_perp',
      ];

      const out_textures = [this.acceleration_texture];

      const set_uniforms = (uniform_locations) => {
        const gl = this.gl;

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.predicted_position_texture);
        gl.uniform1i(uniform_locations[0], 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.neighbor_texture_0);
        gl.uniform1i(uniform_locations[1], 1);

        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, this.neighbor_texture_1);
        gl.uniform1i(uniform_locations[2], 2);

        gl.uniform1i(uniform_locations[3], this.flocking_interface.number_agents.value);
        gl.uniform1f(uniform_locations[4], this.region_width);
        gl.uniform1f(uniform_locations[5], this.region_height);
        gl.uniform1f(uniform_locations[6], this.region_depth);
        gl.uniform1f(uniform_locations[7], this.flocking_interface.dt.value);
        gl.uniform1f(uniform_locations[8], this.flocking_interface.abar.value);
        gl.uniform1f(uniform_locations[9], this.flocking_interface.eta.value);
        gl.uniform1f(uniform_locations[10], this.flocking_interface.lambda.value);
        gl.uniform1f(uniform_locations[11], this.flocking_interface.omega.value);
        gl.uniform1f(uniform_locations[12], this.flocking_interface.center.value);
        gl.uniform1f(uniform_locations[13], this.flocking_interface.log_attraction.checked ? 1.0 : 0.0);
        gl.uniform1f(uniform_locations[14], this.flocking_interface.predator_constant.value);
        gl.uniform1i(uniform_locations[15], this.predator_active);
        gl.uniform3fv(uniform_locations[16], this.predator_position);
        gl.uniform1i(uniform_locations[17], this.flocking_interface.neighbor_count.value);
        gl.uniform1f(uniform_locations[18], this.flocking_interface.cohesion.value);

        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, this.velocity_texture);
        gl.uniform1i(uniform_locations[19], 3);

        gl.uniform1f(uniform_locations[20], this.flocking_interface.alignment.value);

        gl.uniform1f(uniform_locations[21], this.flocking_interface.epsilon_par.value);
        gl.uniform1f(uniform_locations[22], this.flocking_interface.sigma_par.value);
        gl.uniform1f(uniform_locations[23], this.flocking_interface.alpha_par.value);
        gl.uniform1f(uniform_locations[24], this.flocking_interface.epsilon_perp.value);
        gl.uniform1f(uniform_locations[25], this.flocking_interface.sigma_perp.value);
        gl.uniform1f(uniform_locations[26], this.flocking_interface.alpha_perp.value);
      };

      return this.setupDefault(UpdateAccelerationShader3, uniforms, out_textures, set_uniforms);
    }

    setupReynoldsAcceleration() {
      const gl = this.gl;

      const uniforms = [
        'position_texture',
        'velocity_texture',
        'neighbor_texture_0',
        'neighbor_texture_1',
        'num_agents',
      ];

      const out_textures = [this.acceleration_texture];

      const set_uniforms = (uniform_locations) => {
        const gl = this.gl;

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.position_texture);
        gl.uniform1i(uniform_locations[0], 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.velocity_texture);
        gl.uniform1i(uniform_locations[1], 1);

        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, this.neighbor_texture_0);
        gl.uniform1i(uniform_locations[2], 2);

        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, this.neighbor_texture_1);
        gl.uniform1i(uniform_locations[3], 3);

        gl.uniform1i(uniform_locations[4], this.flocking_interface.number_agents.value);
      };

      return this.setupDefault(UpdateAccelerationShader, uniforms, out_textures, set_uniforms);
    }

    setupUpdateVelocity() {
      const gl = this.gl;

      const uniforms = [
        'velocity_texture',
        'acceleration_texture',
        'dt',
        'vbar',
        'num_agents',
        'vmin',
        'random_texture',
        'random_magnitude',
      ];

      const out_textures = [this.velocity_out_texture];

      const set_uniforms = (uniform_locations) => {
        const gl = this.gl;

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.velocity_texture);
        gl.uniform1i(uniform_locations[0], 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.acceleration_texture);
        gl.uniform1i(uniform_locations[1], 1);

        gl.uniform1f(uniform_locations[2], this.flocking_interface.dt.value);
        gl.uniform1f(uniform_locations[3], this.flocking_interface.vbar.value);
        gl.uniform1i(uniform_locations[4], this.flocking_interface.number_agents.value);
        gl.uniform1f(uniform_locations[5], this.flocking_interface.vmin.value);

        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, this.random_value);
        gl.uniform1i(uniform_locations[6], 2);

        gl.uniform1f(uniform_locations[7], this.flocking_interface.random_magnitude.value);
      };

      return this.setupDefault(UpdateVelocityShader, uniforms, out_textures, set_uniforms);
    }

    setupCopyVelocity() {
      const gl = this.gl;

      const uniforms = ['original'];
      const out_textures = [this.velocity_texture];

      const set_uniforms = (uniform_locations) => {
        const gl = this.gl;

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.velocity_out_texture);
        gl.uniform1i(uniform_locations[0], 0);
      };

      return this.setupDefault(CopyShader, uniforms, out_textures, set_uniforms);
    }

    setupUpdatePosition() {
      const gl = this.gl;

      const uniforms = [
        'velocity_texture',
        'agent_texture',
        'num_agents',
        'dt',
        'region_width',
        'region_height',
        'region_depth',
      ];

      const out_textures = [this.position_out_texture];

      const set_uniforms = (uniform_locations) => {
        const gl = this.gl;

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.velocity_texture);
        gl.uniform1i(uniform_locations[0], 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.position_texture);
        gl.uniform1i(uniform_locations[1], 1);

        gl.uniform1i(uniform_locations[2], this.flocking_interface.number_agents.value);
        gl.uniform1f(uniform_locations[3], this.flocking_interface.dt.value);
        gl.uniform1f(uniform_locations[4], this.region_width);
        gl.uniform1f(uniform_locations[5], this.region_height);
        gl.uniform1f(uniform_locations[6], this.region_depth);
      };

      return this.setupDefault(UpdateAgentShader, uniforms, out_textures, set_uniforms);
    }

    setupCopyPosition() {
      const gl = this.gl;

      const uniforms = ['original'];
      const out_textures = [this.position_texture];

      const set_uniforms = (uniform_locations) => {
        const gl = this.gl;

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.position_out_texture);
        gl.uniform1i(uniform_locations[0], 0);
      };

      return this.setupDefault(CopyShader, uniforms, out_textures, set_uniforms);
    }

    setupCheckCollisions() {
      const gl = this.gl;

      const uniforms = [
        'num_agents',
        'agent_texture',
        'neighbor_texture_0',
      ];

      const out_textures = [this.collision_texture];

      const set_uniforms = (uniform_locations) => {
        const gl = this.gl;

        gl.uniform1i(uniform_locations[0], this.flocking_interface.number_agents.value);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.position_texture);
        gl.uniform1i(uniform_locations[1], 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.neighbor_texture_0);
        gl.uniform1i(uniform_locations[2], 1);
      };

      return this.setupDefault(CheckCollisionsShader, uniforms, out_textures, set_uniforms);
    }

    setupAll() {
      this.initDefaultVertexBuffer();
      this.initDisplayVertexBuffer();

      this.display_info = this.setupDisplay();
      this.random_info = this.setupRandom();
      this.random_copy_info = this.setupCopyRandom();
      this.neighbor_info = this.setupNeighbors();
      this.predict_movement_info = this.setupPredictMovement();
      this.update_acceleration_info = this.setupUpdateAcceleration();
      this.update_acceleration_2_info = this.setupUpdateAcceleration2();
      this.update_acceleration_3_info = this.setupUpdateAcceleration3();
      this.reynolds_acceleration_info = this.setupReynoldsAcceleration();
      this.update_velocity_info = this.setupUpdateVelocity();
      this.copy_velocity_info = this.setupCopyVelocity();
      this.update_position_info = this.setupUpdatePosition();
      this.copy_position_info = this.setupCopyPosition();
      this.check_collisions_info = this.setupCheckCollisions();
    }

    runAll() {
      // const arr = new Float32Array(this.agent_width*this.agent_height*4);
      this.runProgram(this.random_info);
      this.runProgram(this.random_copy_info);
      this.runProgram(this.neighbor_info);
      this.runProgram(this.predict_movement_info);
      if (this.flocking_interface.int_mpc.checked) {
        this.runProgram(this.update_acceleration_info);
      } else if (this.flocking_interface.int_sym.checked) {
        this.runProgram(this.update_acceleration_2_info);
      } else if (this.flocking_interface.int_flav.checked) {
        this.runProgram(this.update_acceleration_3_info);
      } else {
        this.runProgram(this.reynolds_acceleration_info);
      }
      // this.getFloatTextureArray(this.random_value, arr);
      // console.log(arr.slice(0,3));
      // console.log(Array.from(arr).filter(x => (x !== x)).length);
      // console.log(Array.from(arr).filter((_,i) => (i%4) !== 0).filter(x => (x !== x)).length);
      // console.log(arr);
      this.runProgram(this.update_position_info);
      this.runProgram(this.copy_position_info);
      this.runProgram(this.update_velocity_info);
      this.runProgram(this.copy_velocity_info);
      this.runProgram(this.check_collisions_info);

      this.runDisplay(this.display_info);
    }
  };
});
