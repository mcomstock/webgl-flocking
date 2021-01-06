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

  function initialize() {
    shaders.updateFromInterface();
    shaders.createAgentTextures();
    shaders.createNeighborTextures();
    shaders.initializeAgents();
    shaders.createAllSolvers();
  }

  function run() {
    shaders.runOneIteration();

    total_collisions += shaders.collision_texture.value.reduce((a, b) => a + b, 0);
    flocking_interface.collision_count_span.textContent = total_collisions;

    window.requestAnimationFrame(run);
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

  flocking_interface.restart_button.addEventListener('click', () => initialize());
  flocking_interface.number_agents.addEventListener('input', () => shaders.createAllSolvers());
  flocking_interface.model_parameters.addEventListener('change', () => shaders.createAllSolvers());
  flocking_interface.view_size.addEventListener('input', () => flocking_interface.updateView());

  flocking_interface.updateView();
  initialize();
  run();
});
