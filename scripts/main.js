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

  let total_collisions = 0;

  const flocking_interface = new FlockingInterface();
  const shaders = new FlockingShaders(flocking_interface);
  const display = new FlockingDisplay(flocking_interface.display_canvas);

  const collision_array = new Float32Array(shaders.agent_width * shaders.agent_height * 4);
  const position_array = new Float32Array(shaders.agent_width * shaders.agent_height * 4);

  function initializeShaders() {
    shaders.createAgentTextures();
    shaders.createNeighborTextures();
    shaders.setupAll();
  }

  function initializeDisplay() {
    display.initBirdShaderProgram();
    display.setAgentCount(flocking_interface.number_agents.value);
    display.resizeViewport();
  }

  function run() {
    shaders.runAll();
    shaders.getFloatTextureArray(shaders.position_texture, position_array);
    display.updatePositionBuffer(position_array);
    display.drawScene();

    shaders.getFloatTextureArray(shaders.collision_texture, collision_array);
    total_collisions += collision_array.reduce((a, b) => a + b, 0);
    flocking_interface.collision_count_span.textContent = total_collisions;

    window.requestAnimationFrame(run);
  }

  new Abubu.MouseListener({
    canvas: flocking_interface.display_canvas,
    event: 'drag',
    callback: (event) => {
      shaders.predator_active = 1;
      shaders.predator_position = [...event.position, 256.0];
    },
  });

  new Abubu.MouseListener({
    canvas: flocking_interface.display_canvas,
    event: 'click',
    callback: (event) => {
      shaders.predator_active = 1;
    },
  });

  flocking_interface.restart_button.addEventListener('click', () => initializeShaders());
  flocking_interface.number_agents.addEventListener('input', () => {
    display.setAgentCount(flocking_interface.number_agents.value);
  });
  flocking_interface.view_size.addEventListener('input', () => {
    flocking_interface.updateView();
    display.resizeViewport();
  });

  flocking_interface.updateView();
  initializeShaders();
  initializeDisplay();
  run();
});
