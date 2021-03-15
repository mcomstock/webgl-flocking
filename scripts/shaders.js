/* global define */
define('scripts/shaders', [
  'libs/Abubu.js',
  'scripts/interface',
  'text!shaders/find_neighbors.frag',
  'text!shaders/predict_movement.frag',
  'text!shaders/update_acceleration.frag',
  'text!shaders/update_velocity.frag',
  'text!shaders/update_agent.frag',
  'text!shaders/check_collisions.frag',
], function(
  Abubu,
  FlockingInterface,
  FindNeighborsShader,
  PredictMovementShader,
  UpdateAccelerationShader,
  UpdateVelocityShader,
  UpdateAgentShader,
  CheckCollisionsShader,
) {
  'use strict';

  return class FlockingShaders {
    constructor(flocking_interface) {
      this.flocking_interface = flocking_interface;

      this.region_width = 512;
      this.region_height = 512;
      this.region_depth = 512;

      // Shader code depends on these specific values
      this.agent_width = 64;
      this.agent_height = 64;
    }

    static defaultEnv() {
      return {
        model: {
          dt: 0.3,
          vbar: 8.0,
          abar: 1.0,
          eta: 1.0,
          lambda: 1.0,
          omega: 30.0,
          predator_constant: 10000.0,
          neighbor_count: 7,
        },
        display: {
          paused: false,
        },
        collisions: {
          collision_distance: 3.0,
        },
        neighbor: {
          neighbor_radius: 8.4,
        },
      };
    }

    updateFromInterface() {
      this.x_min = parseFloat(this.flocking_interface.x_min.value);
      this.x_max = parseFloat(this.flocking_interface.x_max.value);
      this.y_min = parseFloat(this.flocking_interface.y_min.value);
      this.y_max = parseFloat(this.flocking_interface.y_max.value);
      this.z_min = parseFloat(this.flocking_interface.z_min.value);
      this.z_max = parseFloat(this.flocking_interface.z_max.value);
    }

    createAgentTextures() {
      this.agent_texture = new Abubu.Float32Texture(this.agent_width, this.agent_height, { pairable: true });
      this.agent_out_texture = new Abubu.Float32Texture(this.agent_width, this.agent_height, { pairable: true });

      this.predicted_position_texture = new Abubu.Float32Texture(this.agent_width, this.agent_height, { pairable: true });

      this.velocity_texture = new Abubu.Float32Texture(this.agent_width, this.agent_height, { pairable: true });
      this.velocity_out_texture = new Abubu.Float32Texture(this.agent_width, this.agent_height, { pairable: true });

      this.acceleration_texture = new Abubu.Float32Texture(this.agent_width, this.agent_height, { pairable: true });

      this.collision_texture = new Abubu.Float32Texture(this.agent_width, this.agent_height, { pairable: true });
    }

    createNeighborTextures() {
      this.neighbor_texture_0 = new Abubu.Uint32Texture(this.agent_width, this.agent_height, { pairable: true });
      this.neighbor_texture_1 = new Abubu.Uint32Texture(this.agent_width, this.agent_height, { pairable: true });
    }

    initializeAgents() {
      var max_agents = this.agent_width * this.agent_height;
      var agent_array = new Float32Array(max_agents * 4);
      var velocity_array = new Float32Array(max_agents * 4);

      var p = 0;
      for (var i = 0; i < max_agents; ++i) {
        agent_array[p] = this.x_min + Math.random() * (this.x_max - this.x_min);
        velocity_array[p++] = (Math.random() - 0.5) * 4.0;

        agent_array[p] = this.y_min + Math.random() * (this.y_max - this.y_min);
        velocity_array[p++] = (Math.random() - 0.5) * 4.0;

        agent_array[p] = this.z_min + Math.random() * (this.z_max - this.z_min);
        velocity_array[p++] = (Math.random() - 0.5) * 4.0;

        agent_array[p] = 0.0;
        velocity_array[p++] = 0.0;
      }

      this.agent_texture.data = agent_array;
      this.velocity_texture.data = velocity_array;
      this.total_collisions = 0;
    }

    createNeighborSolver() {
      this.neighbor_solver = new Abubu.Solver({
        fragmentShader: FindNeighborsShader,
        uniforms: {
          num_agents: {
            type: 'i',
            value: this.flocking_interface.number_agents.value,
          },
          agent_texture: {
            type: 't',
            value: this.agent_texture,
          },
          neighbor_radius: {
            type: 'f',
            value: this.flocking_interface.neighbor_radius.value,
          },
        },
        targets: {
          neighbor_texture_0: {
            location: 0,
            target: this.neighbor_texture_0,
          },
          neighbor_texture_1: {
            location: 1,
            target: this.neighbor_texture_1,
          },
        },
      });
    }

    createPredictMovementSolver() {
      this.predict_movement_solver = new Abubu.Solver({
        fragmentShader: PredictMovementShader,
        uniforms: {
          agent_texture: {
            type: 't',
            value: this.agent_texture,
          },
          velocity_texture: {
            type: 't',
            value: this.velocity_texture,
          },
          dt: {
            type: 'f',
            value: this.flocking_interface.dt.value,
          },
        },
        targets: {
          predicted_position_texture: {
            location: 0,
            target: this.predicted_position_texture,
          },
        },
      });
    }

    createUpdateAccelerationSolver() {
      this.update_acceleration_solver = new Abubu.Solver({
        fragmentShader: UpdateAccelerationShader,
        uniforms: {
          predicted_position_texture: {
            type: 't',
            value: this.predicted_position_texture,
          },
          neighbor_texture_0: {
            type: 't',
            value: this.neighbor_texture_0,
          },
          neighbor_texture_1: {
            type: 't',
            value: this.neighbor_texture_1,
          },
          num_agents: {
            type: 'i',
            value: this.flocking_interface.number_agents.value,
          },
          region_width: {
            type: 'f',
            value: this.region_width,
          },
          region_height: {
            type: 'f',
            value: this.region_height,
          },
          region_depth: {
            type: 'f',
            value: this.region_depth,
          },
          dt: {
            type: 'f',
            value: this.flocking_interface.dt.value,
          },
          abar: {
            type: 'f',
            value: this.flocking_interface.abar.value,
          },
          eta: {
            type: 'f',
            value: this.flocking_interface.eta.value,
          },
          lambda: {
            type: 'f',
            value: this.flocking_interface.lambda.value,
          },
          omega: {
            type: 'f',
            value: this.flocking_interface.omega.value,
          },
          center_pull: {
            type: 'f',
            value: this.flocking_interface.center.value,
          },
          log_attraction: {
            type: 'f',
            value: this.flocking_interface.log_attraction.checked ? 1.0 : 0.0,
          },
          predator_constant: {
            type: 'f',
            value: this.flocking_interface.predator_constant.value,
          },
          predator_active: {
            // This is read as a bool but passed as an int
            type: 'i',
            value: 0,
          },
          predator_position: {
            type: 'v3',
            value: [0.0, 0.0, 0.0],
          },
          neighbor_count: {
            type: 'i',
            value: this.flocking_interface.neighbor_count.value,
          },
        },
        targets: {
          acceleration_texture: {
            location: 0,
            target: this.acceleration_texture,
          },
        },
      });
    }

    createUpdateVelocitySolver() {
      this.update_velocity_solver = new Abubu.Solver({
        fragmentShader: UpdateVelocityShader,
        uniforms: {
          velocity_texture: {
            type: 't',
            value: this.velocity_texture,
          },
          acceleration_texture: {
            type: 't',
            value: this.acceleration_texture,
          },
          dt: {
            type: 'f',
            value: this.flocking_interface.dt.value,
          },
          vbar: {
            type: 'f',
            value: this.flocking_interface.vbar.value,
          },
          num_agents: {
            type: 'i',
            value: this.flocking_interface.number_agents.value,
          },
        },
        targets: {
          velocity_out_texture: {
            location: 0,
            target: this.velocity_out_texture,
          },
        },
      });
    }

    createVelocityCopySolver() {
      this.velocity_copy = new Abubu.Copy(this.velocity_out_texture, this.velocity_texture);
    }

    createUpdateAgentSolver() {
      this.update_agent_solver = new Abubu.Solver({
        fragmentShader: UpdateAgentShader,
        uniforms: {
          velocity_texture: {
            type: 't',
            value: this.velocity_texture,
          },
          agent_texture: {
            type: 't',
            value: this.agent_texture,
          },
          num_agents: {
            type: 'i',
            value: this.flocking_interface.number_agents.value,
          },
          dt: {
            type: 'f',
            value: this.flocking_interface.dt.value,
          },
          region_width: {
            type: 'f',
            value: this.region_width,
          },
          region_height: {
            type: 'f',
            value: this.region_height,
          },
          region_depth: {
            type: 'f',
            value: this.region_depth,
          },
        },
        targets: {
          agent_out_texture: {
            location: 0,
            target: this.agent_out_texture,
          },
        },
      });
    }

    createAgentCopySolver() {
      this.agent_copy = new Abubu.Copy(this.agent_out_texture, this.agent_texture);
    }

    createCheckCollisionsSolver() {
      this.check_collisions_solver = new Abubu.Solver({
        fragmentShader: CheckCollisionsShader,
        uniforms: {
          num_agents: {
            type: 'i',
            value: this.flocking_interface.number_agents.value,
          },
          agent_texture: {
            type: 't',
            value: this.agent_texture,
          },
          neighbor_texture_0: {
            type: 't',
            value: this.neighbor_texture_0,
          },
          collision_distance: {
            type: 'f',
            value: this.flocking_interface.collision_distance.value,
          },
        },
        targets: {
          collision_texture: {
            location: 0,
            target: this.collision_texture,
          },
        },
      });
    }

    updateNeighborSolver() {
      this.neighbor_solver.uniforms.num_agents.value = this.flocking_interface.number_agents.value;
      this.neighbor_solver.uniforms.neighbor_radius.value = this.flocking_interface.neighbor_radius.value;
    }

    updatePredictMovementSolver() {
      this.predict_movement_solver.uniforms.dt.value = this.flocking_interface.dt.value;
    }

    updateUpdateAccelerationSolver() {
      this.update_acceleration_solver.uniforms.num_agents.value = this.flocking_interface.number_agents.value;
      this.update_acceleration_solver.uniforms.dt.value = this.flocking_interface.dt.value;
      this.update_acceleration_solver.uniforms.abar.value = this.flocking_interface.abar.value;
      this.update_acceleration_solver.uniforms.eta.value = this.flocking_interface.eta.value;
      this.update_acceleration_solver.uniforms.lambda.value = this.flocking_interface.lambda.value;
      this.update_acceleration_solver.uniforms.omega.value = this.flocking_interface.omega.value;
      this.update_acceleration_solver.uniforms.center_pull.value = this.flocking_interface.center.value;
      this.update_acceleration_solver.uniforms.log_attraction.value = this.flocking_interface.log_attraction.checked ? 1.0 : 0.0;
      this.update_acceleration_solver.uniforms.predator_constant.value = this.flocking_interface.predator_constant.value;
      this.update_acceleration_solver.uniforms.neighbor_count.value = this.flocking_interface.neighbor_count.value;
    }

    updateUpdateVelocitySolver() {
      this.update_velocity_solver.uniforms.num_agents.value = this.flocking_interface.number_agents.value;
      this.update_velocity_solver.uniforms.dt.value = this.flocking_interface.dt.value;
      this.update_velocity_solver.uniforms.vbar.value = this.flocking_interface.vbar.value;
    }

    updateUpdateAgentSolver() {
      this.update_agent_solver.uniforms.num_agents.value = this.flocking_interface.number_agents.value;
      this.update_agent_solver.uniforms.dt.value = this.flocking_interface.dt.value;
    }

    updateCheckCollisionsSolver() {
      this.check_collisions_solver.uniforms.num_agents.value = this.flocking_interface.number_agents.value;
      this.check_collisions_solver.uniforms.collision_distance.value = this.flocking_interface.collision_distance.value;
    }

    updateAllSolvers() {
      this.updateNeighborSolver();
      this.updatePredictMovementSolver();
      this.updateUpdateAccelerationSolver();
      this.updateUpdateVelocitySolver();
      this.updateUpdateAgentSolver();
      this.updateCheckCollisionsSolver();
    }

    createAllSolvers() {
      this.createNeighborSolver();
      this.createPredictMovementSolver();
      this.createUpdateAccelerationSolver();
      this.createUpdateVelocitySolver();
      this.createUpdateAgentSolver();
      this.createAgentCopySolver();
      this.createVelocityCopySolver();
      this.createCheckCollisionsSolver();
    }

    runOneIteration() {
      this.neighbor_solver.render();
      this.predict_movement_solver.render();
      this.update_acceleration_solver.render();
      this.update_velocity_solver.render();
      this.velocity_copy.render();
      this.update_agent_solver.render();
      this.agent_copy.render();
      this.check_collisions_solver.render();
    }
  };
});
