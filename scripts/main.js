/* global require */
require([
  'libs/Abubu.js',
  'text!shaders/find_neighbors.frag',
  'text!shaders/update_agents.frag',
  'text!shaders/display_agents.frag',
  'text!shaders/check_collisions.frag',
], function(
  Abubu,
  FindNeighborsShader,
  UpdateAgentsShader,
  DisplayAgentsShader,
  CheckCollisionsShader,
) {
  'use strict';

  var region_canvas = document.getElementById('region_canvas');
  var agent_canvas = document.getElementById('agent_canvas');
  var collison_count_span = document.getElementById('collison_count');

  var region_width = parseInt(region_canvas.getAttribute('width'));
  var region_height = parseInt(region_canvas.getAttribute('height'));
  var region_size = region_width * region_height;

  // Create an array of agents with randomly assigned 2-D coordinates.
  var num_agents = parseInt(agent_canvas.getAttribute('width'));
  var agent_array = new Float32Array(num_agents * 4);
  var velocity_array = new Float32Array(num_agents * 4);

  var agents_texture = new Abubu.Float32Texture(num_agents, 1, { pairable: true });
  var agents_out_texture = new Abubu.Float32Texture(num_agents, 1, { pairable: true });

  var velocity_texture = new Abubu.Float32Texture(num_agents, 1, { pairable: true });
  var velocity_out_texture = new Abubu.Float32Texture(num_agents, 1, { pairable: true });

  var neighbor_texture_0 = new Abubu.Float32Texture(region_width, region_height, { pairable: true });
  var neighbor_texture_1 = new Abubu.Float32Texture(region_width, region_height, { pairable: true });
  var neighbor_texture_2 = new Abubu.Float32Texture(region_width, region_height, { pairable: true });
  var neighbor_texture_3 = new Abubu.Float32Texture(region_width, region_height, { pairable: true });

  var collision_texture = new Abubu.Float32Texture(num_agents, 1, { pariable: true });

  var env = {
    model: {
      dt: 0.3,
      vbar: 8.0,
      abar: 1.0,
      eta: 1.0,
      lambda: 1.0,
      omega: 30.0,
      predator_constant: 10000.0,
    },
    display: {
      paused: false,
    },
    collisions: {
      collision_distance: 3.0,
    },
    neighbor: {
      neighbor_radius: 8.4,
    },
  };

  var total_collisions = 0;

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
      neighbor_radius: {
        type: 'f',
        value: env.neighbor.neighbor_radius,
      },
    },
    targets: {
      neighbor_texture_1: {
        location: 0,
        target: neighbor_texture_0,
      },
      neighbor_texture_2: {
        location: 1,
        target: neighbor_texture_1,
      },
      neighbor_texture_3: {
        location: 2,
        target: neighbor_texture_2,
      },
      neighbor_texture_4: {
        location: 3,
        target: neighbor_texture_3,
      },
    },
    canvas: region_canvas,
  });

  var agent_update_solver = new Abubu.Solver({
    fragmentShader: UpdateAgentsShader,
    uniforms: {
      num_agents: {
        type: 'i',
        value: num_agents,
      },
      agents_texture: {
        type: 't',
        value: agents_texture,
      },
      velocity_texture: {
        type: 't',
        value: velocity_texture,
      },
      neighbor_texture_0: {
        type: 't',
        value: neighbor_texture_0,
      },
      neighbor_texture_1: {
        type: 't',
        value: neighbor_texture_1,
      },
      neighbor_texture_2: {
        type: 't',
        value: neighbor_texture_2,
      },
      neighbor_texture_3: {
        type: 't',
        value: neighbor_texture_3,
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
        value: env.model.dt,
      },
      vbar: {
        type: 'f',
        value: env.model.vbar,
      },
      abar: {
        type: 'f',
        value: env.model.abar,
      },
      eta: {
        type: 'f',
        value: env.model.eta,
      },
      lambda: {
        type: 'f',
        value: env.model.lambda,
      },
      omega: {
        type: 'f',
        value: env.model.omega,
      },
      predator_constant: {
        type: 'f',
        value: env.model.predator_constant,
      },
      predator_active: {
        // This is read as a bool but passed as an int
        type: 'i',
        value: 0,
      },
      predator_position: {
        type: 'v2',
        value: [0.0, 0.0],
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

  var check_collisions_solver = new Abubu.Solver({
    fragmentShader: CheckCollisionsShader,
    uniforms: {
      agents_texture: {
        type: 't',
        value: agents_texture,
      },
      neighbor_texture_0: {
        type: 't',
        value: neighbor_texture_0,
      },
      neighbor_texture_1: {
        type: 't',
        value: neighbor_texture_1,
      },
      neighbor_texture_2: {
        type: 't',
        value: neighbor_texture_2,
      },
      neighbor_texture_3: {
        type: 't',
        value: neighbor_texture_3,
      },
      collision_distance: {
        type: 'f',
        value: env.collisions.collision_distance,
      },
    },
    targets: {
      collision_texture: {
        location: 0,
        target: collision_texture,
      },
    },
    canvas: agent_canvas,
  });

  function initialize() {
    var p = 0;
    for (var i = 0; i < num_agents; ++i) {
      agent_array[p] = Math.random() * 30.0;
      velocity_array[p++] = Math.random() * 2.0;

      agent_array[p] = Math.random() * 30.0;
      velocity_array[p++] = Math.random() * 2.0;

      agent_array[p] = 0.0;
      velocity_array[p++] = 0.0;

      agent_array[p] = 0.0;
      velocity_array[p++] = 0.0;
    }

    agents_texture.data = agent_array;
    velocity_texture.data = velocity_array;
  }

  function run() {
    if (!env.display.paused) {
      neighbor_solver.render();
      agent_update_solver.render();
      agent_copy.render();
      velocity_copy.render();
      agent_display.render();
      check_collisions_solver.render();
    }

    total_collisions += collision_texture.value.reduce((a, b) => a + b, 0);
    collison_count_span.textContent = total_collisions;

    window.requestAnimationFrame(run);
  }

  function create_gui_folder(folder, params, solvers) {
    var folder_elements = {};
    Object.keys(params).forEach((param) => {
      folder_elements[param] = folder.add(params, param);
      folder_elements[param].onChange(() => {
        Abubu.setUniformInSolvers(param, params[param], solvers);
      });
    });

    return folder_elements;
  }

  function create_gui() {
    var gui = new Abubu.Gui();
    var panel = gui.addPanel({ width: 300 });

    var params_folder = panel.addFolder('Model Parameters');
    params_folder.elements = create_gui_folder(params_folder, env.model, [agent_update_solver]);

    var display_folder = panel.addFolder('Display Parameters');
    display_folder.elements = create_gui_folder(display_folder, env.display, []);

    var collisions_folder = panel.addFolder('Collison Parameters');
    collisions_folder.elements = create_gui_folder(collisions_folder, env.collisions, [check_collisions_solver]);

    var neighbor_folder = panel.addFolder('Neighbor Parameters');
    neighbor_folder.elements = create_gui_folder(neighbor_folder, env.neighbor, [neighbor_solver]);
  }

  new Abubu.MouseListener({
    canvas: region_canvas,
    event: 'drag',
    callback: (event) => {
      agent_update_solver.uniforms.predator_active.value = 1;
      agent_update_solver.uniforms.predator_position.value = event.position;
    },
  });

  new Abubu.MouseListener({
    canvas: region_canvas,
    event: 'click',
    callback: (event) => {
      agent_update_solver.uniforms.predator_active.value = 0;
    },
  });

  create_gui();
  initialize();
  run();
});
