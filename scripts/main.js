/* global require */
require([
  'libs/Abubu.js',
  'scripts/display',
  'scripts/interface',
  'scripts/shaders',
], function(
  Abubu,
  FlockingDisplay,
  FlockingInterface,
  FlockingShaders,
) {
  'use strict';

  var total_collisions = 0;

  var flocking_interface = new FlockingInterface();
  var shaders = new FlockingShaders(flocking_interface);
  var display = new FlockingDisplay(flocking_interface.display_canvas);

  function initializeShaders() {
    shaders.updateFromInterface();
    shaders.createAgentTextures();
    shaders.createNeighborTextures();
    shaders.initializeAgents();
    shaders.createAllSolvers();
  }

  function initializeDisplay() {
    display.initBirdShaderProgram();
    display.setAgentCount(flocking_interface.number_agents.value);
    display.resizeViewport();
  }

  function run() {
    shaders.runOneIteration();
    display.updatePositionBuffer(shaders.agents_texture.value);
    display.drawScene();

    var collisions = shaders.collision_texture.value.reduce((a, b) => a + b, 0);
    total_collisions += collisions;
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

  flocking_interface.restart_button.addEventListener('click', () => initializeShaders());
  flocking_interface.number_agents.addEventListener('input', () => {
    shaders.updateAllSolvers();
    display.setAgentCount(flocking_interface.number_agents.value);
  });
  flocking_interface.model_parameters.addEventListener('change', () => shaders.updateAllSolvers());
  flocking_interface.view_size.addEventListener('input', () => {
    flocking_interface.updateView();
    display.resizeViewport();
  });

  flocking_interface.updateView();
  initializeShaders();
  initializeDisplay();
  run();
});
