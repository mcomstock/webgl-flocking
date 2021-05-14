/* global define */
define('scripts/interface', [], function() {
  'use strict';

  return class FlockingInterface {
    constructor() {
      this.display_canvas = document.getElementById('display_canvas');

      this.collision_count_span = document.getElementById('collision_count');

      this.number_agents = document.getElementById('number_agents');
      this.restart_button = document.getElementById('restart_button');

      this.view_size = document.getElementById('view_size');

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

      this.model_parameters = document.getElementById('model_parameters');

      this.log_attraction = document.getElementById('log_attraction');
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
    }

    static getWidth(element) {
      return parseInt(element.getAttribute('width'));
    }

    static getHeight(element) {
      return parseInt(element.getAttribute('height'));
    }

    updateView() {
      this.display_canvas.setAttribute('width', parseInt(this.view_size.value));
      this.display_canvas.setAttribute('height', parseInt(this.view_size.value));
    }
  };
});
