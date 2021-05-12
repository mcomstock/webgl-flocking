/* global require */
require([
  'scripts/interface',
  'scripts/shaders',
], function(
  FlockingInterface,
  FlockingShaders,
) {
  'use strict';

  let total_collisions = 0;

  const flocking_interface = new FlockingInterface();
  const shaders = new FlockingShaders(flocking_interface);

  const collision_array = new Float32Array(shaders.agent_width * shaders.agent_height * 4);
  const position_array = new Float32Array(shaders.agent_width * shaders.agent_height * 4);

  function initializeShaders() {
    shaders.createAgentTextures();
    shaders.createNeighborTextures();
    shaders.setupAll();
    total_collisions = 0;
  }

  function run() {
    shaders.runAll();
    shaders.getFloatTextureArray(shaders.position_texture, position_array);

    shaders.getFloatTextureArray(shaders.collision_texture, collision_array);
    total_collisions += collision_array.reduce((a, b) => a + b, 0);
    flocking_interface.collision_count_span.textContent = total_collisions;

    window.requestAnimationFrame(run);
  }

  flocking_interface.restart_button.addEventListener('click', () => initializeShaders());
  flocking_interface.number_agents.addEventListener('input', () => {
  });
  flocking_interface.view_size.addEventListener('input', () => {
    flocking_interface.updateView();
  });

  flocking_interface.updateView();
  initializeShaders();
  run();
});
