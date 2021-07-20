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
      this.eta = document.getElementById('param_eta');
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

      this.model_parameters = document.getElementById('model_parameters');

      this.log_attraction = document.getElementById('log_attraction');
      this.pause = document.getElementById('toggle_pause');
      this.toggle_parameters = document.getElementById('toggle_parameters');

      this.epsilon_par = document.getElementById('param_epsilon_par');
      this.sigma_par = document.getElementById('param_sigma_par');
      this.alpha_par = document.getElementById('param_alpha_par');
      this.epsilon_perp = document.getElementById('param_epsilon_perp');
      this.sigma_perp = document.getElementById('param_sigma_perp');
      this.alpha_perp = document.getElementById('param_alpha_perp');

      this.int_mpc = document.getElementById('int_mpc');
      this.int_sym = document.getElementById('int_sym');
      this.int_flav = document.getElementById('int_flav');

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
  };
});
