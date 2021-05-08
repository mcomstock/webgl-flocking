/* global define */
define('scripts/shaders', [
  'text!shaders/copy.frag',
  'text!shaders/default.vert',
  'text!shaders/find_neighbors.frag',
  'text!shaders/predict_movement.frag',
  'text!shaders/update_acceleration.frag',
  'text!shaders/update_velocity.frag',
  'text!shaders/update_agent.frag',
  'text!shaders/check_collisions.frag',
  'text!shaders/display/model.vert',
  'text!shaders/display/model.frag',
], function(
  CopyShader,
  DefaultVertexShader,
  FindNeighborsShader,
  PredictMovementShader,
  UpdateAccelerationShader,
  UpdateVelocityShader,
  UpdateAgentShader,
  CheckCollisionsShader,
  ModelVertexShader,
  ModelFragmentShader,
) {
  'use strict';

  return class FlockingShaders {
    constructor(flocking_interface) {
      this.flocking_interface = flocking_interface;

      this.region_width = 512;
      this.region_height = 512;
      this.region_depth = 512;

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

    initializeAgents() {
      const max_agents = this.agent_width * this.agent_height;
      const agent_array = new Float32Array(max_agents * 4);
      const velocity_array = new Float32Array(max_agents * 4);

      let p = 0;
      for (let i = 0; i < max_agents; ++i) {
        agent_array[p] = Math.random() * 512;
        velocity_array[p++] = (Math.random() - 0.5) * 4.0;

        agent_array[p] = Math.random() * 512;
        velocity_array[p++] = (Math.random() - 0.5) * 4.0;

        agent_array[p] = Math.random() * 512;
        velocity_array[p++] = (Math.random() - 0.5) * 4.0;

        agent_array[p] = 0.0;
        velocity_array[p++] = 0.0;
      }

      this.total_collisions = 0;

      return [ agent_array, velocity_array ];
    }

    createAgentTextures() {
      const [ agent_array, velocity_array ] = this.initializeAgents();

      this.position_texture = this.loadFloatTexture(this.agent_width, this.agent_height, agent_array);
      this.position_out_texture = this.loadFloatTexture(this.agent_width, this.agent_height, null);

      this.predicted_position_texture = this.loadFloatTexture(this.agent_width, this.agent_height, null);

      this.velocity_texture = this.loadFloatTexture(this.agent_width, this.agent_height, velocity_array);
      this.velocity_out_texture = this.loadFloatTexture(this.agent_width, this.agent_height, null);

      this.acceleration_texture = this.loadFloatTexture(this.agent_width, this.agent_height, null);

      this.collision_texture = this.loadFloatTexture(this.agent_width, this.agent_height, null);
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

    getViewMatrix(dist_scale) {
      return [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, dist_scale,
        0, 0, 0, 1,
      ];
    }

    runDisplay(display_info) {
      const gl = this.gl;

      const old_width = this.canvas.width;
      const old_height = this.canvas.height;

      this.canvas.width = this.flocking_interface.display_canvas.width;
      this.canvas.height = this.flocking_interface.display_canvas.height;

      gl.viewport(0, 0, this.canvas.width, this.canvas.height);

      const view_matrix = this.getViewMatrix(1.0);

      const { program, uniform_locations, set_uniforms } = display_info;
      gl.useProgram(program);
      set_uniforms(uniform_locations, view_matrix);

      gl.clearColor(1.0, 1.0, 1.0, 1.0);
      gl.clearDepth(1.0);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);

      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

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

      const uniforms = ['position_texture', 'velocity_texture', 'view_matrix'];

      info.program = this.loadShaderProgram(ModelVertexShader, ModelFragmentShader);
      gl.useProgram(info.program);

      info.uniform_locations = uniforms.map(u => gl.getUniformLocation(info.program, u));
      info.set_uniforms = (uniform_locations, view_matrix) => {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.position_texture);
        gl.uniform1i(uniform_locations[0], 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.velocity_texture);
        gl.uniform1i(uniform_locations[1], 1);

        gl.uniformMatrix4fv(uniform_locations[2], false, view_matrix);
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
        'collision_distance',
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

        gl.uniform1f(uniform_locations[3], this.flocking_interface.collision_distance.value);
      };

      return this.setupDefault(CheckCollisionsShader, uniforms, out_textures, set_uniforms);
    }

    setupAll() {
      this.initDefaultVertexBuffer();
      this.initDisplayVertexBuffer();

      this.display_info = this.setupDisplay();
      this.neighbor_info = this.setupNeighbors();
      this.predict_movement_info = this.setupPredictMovement();
      this.update_acceleration_info = this.setupUpdateAcceleration();
      this.update_velocity_info = this.setupUpdateVelocity();
      this.copy_velocity_info = this.setupCopyVelocity();
      this.update_position_info = this.setupUpdatePosition();
      this.copy_position_info = this.setupCopyPosition();
      this.check_collisions_info = this.setupCheckCollisions();
    }

    runAll() {
      this.runProgram(this.neighbor_info);
      this.runProgram(this.predict_movement_info);
      this.runProgram(this.update_acceleration_info);
      this.runProgram(this.update_velocity_info);
      this.runProgram(this.copy_velocity_info);
      this.runProgram(this.update_position_info);
      this.runProgram(this.copy_position_info);
      this.runProgram(this.check_collisions_info);

      this.runDisplay(this.display_info);
    }
  };
});
