/* global require */
require([
  'libs/Abubu.js',
  'scripts/shaders',
], function(
  Abubu,
  FlockingShaders,
) {
  'use strict';

  var display_canvas = document.getElementById('display_canvas');
  var region_canvas = document.getElementById('region_canvas');
  var agent_canvas = document.getElementById('agent_canvas');
  var collision_count_span = document.getElementById('collision_count');

  var total_collisions = 0;

  var shaders = new FlockingShaders(region_canvas, agent_canvas, display_canvas);
  shaders.setEnv(FlockingShaders.defaultEnv());

  function initialize() {
    var x_min = parseFloat(document.getElementById('x_init_min').value);
    var x_max = parseFloat(document.getElementById('x_init_max').value);
    var y_min = parseFloat(document.getElementById('y_init_min').value);
    var y_max = parseFloat(document.getElementById('y_init_max').value);

    shaders.createAgentTextures();
    shaders.createNeighborTextures();
    shaders.initializeAgents(x_min, x_max, y_min, y_max);
    shaders.createAllSolvers();
  }

  function update_view() {
    var view_width = parseInt(document.getElementById('view_width').value);
    var view_height = parseInt(document.getElementById('view_height').value);

    display_canvas.setAttribute('width', view_width);
    display_canvas.setAttribute('height', view_height);
  }

  function run() {
    if (!shaders.env.display.paused) {
      shaders.runOneIteration();
    }

    total_collisions += shaders.collision_texture.value.reduce((a, b) => a + b, 0);
    collision_count_span.textContent = total_collisions;

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
    canvas: display_canvas,
    event: 'drag',
    callback: (event) => {
      shaders.agent_update_solver.uniforms.predator_active.value = 1;
      shaders.agent_update_solver.uniforms.predator_position.value = event.position;
    },
  });

  new Abubu.MouseListener({
    canvas: display_canvas,
    event: 'click',
    callback: (event) => {
      shaders.agent_update_solver.uniforms.predator_active.value = 0;
    },
  });

  var restart_button = document.getElementById('restart_button');
  restart_button.addEventListener("click", () => initialize());

  var view_button = document.getElementById('view_button');
  view_button.addEventListener("click", () => update_view());

  update_view();
  initialize();
  create_gui();
  run();
});
