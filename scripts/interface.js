/* global define */
define('scripts/interface', [], function() {
  'use strict';

  return class FlockingInterface {
    constructor() {
      this.display_canvas = document.getElementById('display_canvas');

      this.collision_count_span = document.getElementById('collision_count');

      this.number_agents = document.getElementById('number_agents');
      this.restart_button = document.getElementById('restart_button');

      this.dt = document.getElementById('param_dt');
      this.vmin = document.getElementById('param_vmin');
      this.vbar = document.getElementById('param_vbar');
      this.abar = document.getElementById('param_abar');
      this.lambda = document.getElementById('param_lambda');
      this.omega = document.getElementById('param_omega');
      this.cohesion = document.getElementById('param_cohesion');
      this.alignment = document.getElementById('param_alignment');
      this.predator_constant = document.getElementById('param_predator_constant');
      this.center = document.getElementById('param_center');
      this.neighbor_count = document.getElementById('param_neighbor_count');
      this.neighbor_radius = document.getElementById('param_neighbor_radius');
      this.random_magnitude = document.getElementById('param_random_magnitude');
      this.vertical_cost = document.getElementById('param_vertical_cost');

      this.pot_alignment_weight = document.getElementById('param_pot_alignment_weight');
      this.pot_potential_weight = document.getElementById('param_pot_potential_weight');
      this.pot_vertical_weight = document.getElementById('param_pot_vertical_weight');
      this.pot_potential_dist = document.getElementById('param_pot_potential_dist');

      this.log_attraction = document.getElementById('log_attraction');
      this.pause = document.getElementById('toggle_pause');
      this.toggle_parameters = document.getElementById('toggle_parameters');

      this.interaction_type = document.getElementById('interaction_type');
      this.int_mpc = document.getElementById('int_mpc');
      this.int_pot = document.getElementById('int_pot');

      this.mpc_parameters = document.getElementById('mpc_parameters');
      this.pot_parameters = document.getElementById('pot_parameters');

      this.param_popup_button = document.getElementById('param_popup_button');
      this.param_popup_content = document.getElementById('param_popup_content');
    }

    static getWidth(element) {
      return parseInt(element.getAttribute('width'));
    }

    static getHeight(element) {
      return parseInt(element.getAttribute('height'));
    }

    updateView() {
      const display_canvas_div = document.getElementById('display_canvas_div');
      this.display_canvas.setAttribute('width', parseInt(display_canvas_div.clientWidth));
      this.display_canvas.setAttribute('height', parseInt(display_canvas_div.clientHeight));
    }

    togglePopup() {
      this.param_popup_content.classList.toggle('show');
    }

    updateParameterView() {
      if (this.int_mpc.checked) {
        this.mpc_parameters.classList.remove('hidden');
      } else {
        this.mpc_parameters.classList.add('hidden');
      }

      if (this.int_pot.checked) {
        this.pot_parameters.classList.remove('hidden');
      } else {
        this.pot_parameters.classList.add('hidden');
      }
    }
  };
});
