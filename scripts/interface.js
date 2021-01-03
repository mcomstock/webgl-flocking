/* global define */
define('scripts/interface', [], function() {
  'use strict';

  return class FlockingInterface {
    constructor() {
      this.display_canvas = document.getElementById('display_canvas');
      this.region_canvas = document.getElementById('region_canvas');
      this.agent_canvas = document.getElementById('agent_canvas');

      this.collision_count_span = document.getElementById('collision_count');

      this.x_min = document.getElementById('x_init_min');
      this.x_max = document.getElementById('x_init_max');
      this.y_min = document.getElementById('y_init_min');
      this.y_max = document.getElementById('y_init_max');
      this.number_agents = document.getElementById('number_agents');
      this.restart_button = document.getElementById('restart_button');

      this.view_width = document.getElementById('view_width');
      this.view_height = document.getElementById('view_height');
      this.view_button = document.getElementById('view_button');
    }

    static getWidth(element) {
      return parseInt(element.getAttribute('width'));
    }

    static getHeight(element) {
      return parseInt(element.getAttribute('height'));
    }

    updateView() {
      this.display_canvas.setAttribute('width', parseInt(this.view_width.value));
      this.display_canvas.setAttribute('height', parseInt(this.view_height.value));
    }

    updateNumberAgents() {
      this.agent_canvas.setAttribute('width', parseInt(this.number_agents.value));
    }
  };
});
