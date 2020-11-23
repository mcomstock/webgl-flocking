/* global require */
require([
  'libs/Abubu.js',
  'text!shaders/find_neighbors.frag',
  'text!shaders/update_agents.frag',
  'text!shaders/display_agents.frag',
], function(
  Abubu,
  FindNeighborsShader,
  UpdateAgentsShader,
  DisplayAgentsShader,
) {
  'use strict';

  var region_canvas = document.getElementById('region_canvas');
  var agent_canvas = document.getElementById('agent_canvas');

  var region_width = parseInt(region_canvas.getAttribute('width'));
  var region_height = parseInt(region_canvas.getAttribute('height'));
  var region_size = region_width * region_height;

  // Create an array of agents with randomly assigned 2-D coordinates.
  var num_agents = parseInt(agent_canvas.getAttribute('width'));
  var agent_array = new Float32Array(num_agents * 4);
  var velocity_array = new Float32Array(num_agents * 4);

  var p = 0;
  for (var i = 0; i < num_agents; ++i) {
    agent_array[p] = Math.random() * 30.0;
    velocity_array[p++] = Math.random() * 2.0;
    // velocity_array[p++] = 1.0;

    agent_array[p] = Math.random() * 30.0;
    velocity_array[p++] = Math.random() * 2.0;
    // velocity_array[p++] = 1.0;

    agent_array[p] = 0.0;
    velocity_array[p++] = 0.0;

    agent_array[p] = 0.0;
    velocity_array[p++] = 0.0;
  }

  var agents_texture = new Abubu.Float32Texture(num_agents, 1, { pairable: true, data: agent_array });
  var agents_out_texture = new Abubu.Float32Texture(num_agents, 1, { pairable: true });

  var velocity_texture = new Abubu.Float32Texture(num_agents, 1, { pairable: true, data: velocity_array });
  var velocity_out_texture = new Abubu.Float32Texture(num_agents, 1, { pairable: true });

  var neighbor_texture = new Abubu.Float32Texture(region_width, region_height, { pairable: true });

  var env = {
    dt: 0.3,
    vbar: 8.0,
    abar: 1.0,
    eta: 1.0,
    lambda: 1.0,
    omega: 30.0,
  };

  var neighbor_solver = new Abubu.Solver({
    fragmentShader: FindNeighborsShader,
    uniforms: {
      num_agents: {
        type: 'i',
        value: num_agents,
      },
      agents_texture: {
        type: 't',
        value: agents_texture,
      },
      region_width: {
        type: 'f',
        value: region_width,
      },
      region_height: {
        type: 'f',
        value: region_height,
      },
    },
    targets: {
      neighbor_texture: {
        location: 0,
        target: neighbor_texture,
      },
    },
    canvas: region_canvas,
  });

  var agent_update_solver = new Abubu.Solver({
    fragmentShader: UpdateAgentsShader,
    uniforms: {
      agents_texture: {
        type: 't',
        value: agents_texture,
      },
      velocity_texture: {
        type: 't',
        value: velocity_texture,
      },
      neighbor_texture: {
        type: 't',
        value: neighbor_texture,
      },
      region_width: {
        type: 'f',
        value: region_width,
      },
      region_height: {
        type: 'f',
        value: region_height,
      },
      dt: {
        type: 'f',
        value: env.dt,
      },
      vbar: {
        type: 'f',
        value: env.vbar,
      },
      abar: {
        type: 'f',
        value: env.abar,
      },
      eta: {
        type: 'f',
        value: env.eta,
      },
      lambda: {
        type: 'f',
        value: env.lambda,
      },
      omega: {
        type: 'f',
        value: env.omega,
      },
    },
    targets: {
      agents_out_texture: {
        location: 0,
        target: agents_out_texture,
      },
      velocity_out_texture: {
        location: 1,
        target: velocity_out_texture,
      },
    },
    canvas: agent_canvas,
  });

  var agent_copy = new Abubu.Copy(agents_out_texture, agents_texture);
  var velocity_copy = new Abubu.Copy(velocity_out_texture, velocity_texture);

  var agent_display = new Abubu.Solver({
    fragmentShader: DisplayAgentsShader,
    uniforms: {
      num_agents: {
        type: 'i',
        value: num_agents,
      },
      agents_texture: {
        type: 't',
        value: agents_texture,
      },
      region_width: {
        type: 'f',
        value: region_width,
      },
      region_height: {
        type: 'f',
        value: region_height,
      },
    },
    canvas: region_canvas,
  });

  function run() {
    neighbor_solver.render();
    agent_update_solver.render();
    agent_copy.render();
    velocity_copy.render();
    agent_display.render();

    window.requestAnimationFrame(run);
  }

  run();
});
