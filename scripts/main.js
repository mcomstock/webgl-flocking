/* global require */
require([
  'libs/Abubu.js',
  'scripts/interface',
  'scripts/shaders',
], function(
  Abubu,
  FlockingInterface,
  FlockingShaders,
) {
  'use strict';

  var total_collisions = 0;

  var flocking_interface = new FlockingInterface();

  var shaders = new FlockingShaders(flocking_interface);
  shaders.setEnv(FlockingShaders.defaultEnv());

  function initialize() {
    flocking_interface.updateNumberAgents();

    shaders.updateFromInterface();
    shaders.createAgentTextures();
    shaders.createNeighborTextures();
    shaders.initializeAgents();
    shaders.createAllSolvers();
  }

  function run() {
    if (!shaders.env.display.paused) {
      shaders.runOneIteration();
    }

    total_collisions += shaders.collision_texture.value.reduce((a, b) => a + b, 0);
    flocking_interface.collision_count_span.textContent = total_collisions;

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
    params_folder.elements = create_gui_folder(params_folder, shaders.env.model, [shaders.agent_update_solver]);

    var display_folder = panel.addFolder('Display Parameters');
    display_folder.elements = create_gui_folder(display_folder, shaders.env.display, []);

    var collisions_folder = panel.addFolder('Collision Parameters');
    collisions_folder.elements = create_gui_folder(collisions_folder, shaders.env.collisions, [shaders.check_collisions_solver]);

    var neighbor_folder = panel.addFolder('Neighbor Parameters');
    neighbor_folder.elements = create_gui_folder(neighbor_folder, shaders.env.neighbor, [shaders.neighbor_solver]);
  }

  new Abubu.MouseListener({
    canvas: flocking_interface.display_canvas,
    event: 'drag',
    callback: (event) => {
      shaders.agent_update_solver.uniforms.predator_active.value = 1;
      shaders.agent_update_solver.uniforms.predator_position.value = event.position;
    },
  });

  new Abubu.MouseListener({
    canvas: flocking_interface.display_canvas,
    event: 'click',
    callback: (event) => {
      shaders.agent_update_solver.uniforms.predator_active.value = 0;
    },
  });

  // This is a lazy solution, since not everything needs to be reset in every case. The time to
  // initialize doesn't seem long enough to matter for now.
  flocking_interface.restart_button.addEventListener('click', () => initialize());

  flocking_interface.number_agents.addEventListener('input', () => {
    shaders.num_agents = flocking_interface.number_agents.value;
    shaders.createAllSolvers();
  });

  flocking_interface.view_size.addEventListener('input', () => flocking_interface.updateView());

  flocking_interface.updateView();
  initialize();
  create_gui();
  run();
});
