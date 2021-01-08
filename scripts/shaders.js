/* global define */
define('scripts/shaders', [
  'libs/Abubu.js',
  'scripts/interface',
  'text!shaders/find_neighbors.frag',
  'text!shaders/update_agents.frag',
  'text!shaders/display_agents.frag',
  'text!shaders/check_collisions.frag',
], function(
  Abubu,
  FlockingInterface,
  FindNeighborsShader,
  UpdateAgentsShader,
  DisplayAgentsShader,
  CheckCollisionsShader,
) {
  'use strict';

  return class FlockingShaders {
    constructor(flocking_interface) {
      this.flocking_interface = flocking_interface;

      this.region_width = 512;
      this.region_height = 512;

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
      this.display_canvas = this.flocking_interface.display_canvas;

      this.x_min = parseFloat(this.flocking_interface.x_min.value);
      this.x_max = parseFloat(this.flocking_interface.x_max.value);
      this.y_min = parseFloat(this.flocking_interface.y_min.value);
      this.y_max = parseFloat(this.flocking_interface.y_max.value);
    }

    createAgentTextures() {
      this.agents_texture = new Abubu.Float32Texture(this.agent_width, this.agent_height, { pairable: true });
      this.agents_out_texture = new Abubu.Float32Texture(this.agent_width, this.agent_height, { pairable: true });

      this.velocity_texture = new Abubu.Float32Texture(this.agent_width, this.agent_height, { pairable: true });
      this.velocity_out_texture = new Abubu.Float32Texture(this.agent_width, this.agent_height, { pairable: true });

      this.collision_texture = new Abubu.Float32Texture(this.agent_width, this.agent_height, { pariable: true });
    }

    createNeighborTextures() {
      this.neighbor_texture_0 = new Abubu.Float32Texture(this.agent_width, this.agent_height, { pairable: true });
      this.neighbor_texture_1 = new Abubu.Float32Texture(this.agent_width, this.agent_height, { pairable: true });
      this.neighbor_texture_2 = new Abubu.Float32Texture(this.agent_width, this.agent_height, { pairable: true });
      this.neighbor_texture_3 = new Abubu.Float32Texture(this.agent_width, this.agent_height, { pairable: true });
    }

    initializeAgents() {
      var max_agents = this.agent_width * this.agent_height;
      var agent_array = new Float32Array(max_agents * 4);
      var velocity_array = new Float32Array(max_agents * 4);

      var p = 0;
      for (var i = 0; i < max_agents; ++i) {
        agent_array[p] = this.x_min + Math.random() * (this.x_max - this.x_min);
        velocity_array[p++] = Math.random() * 2.0;

        agent_array[p] = this.y_min + Math.random() * (this.y_max - this.y_min);
        velocity_array[p++] = Math.random() * 2.0;

        agent_array[p] = 0.0;
        velocity_array[p++] = 0.0;

        agent_array[p] = 0.0;
        velocity_array[p++] = 0.0;
      }

      this.agents_texture.data = agent_array;
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
          agents_texture: {
            type: 't',
            value: this.agents_texture,
          },
          region_width: {
            type: 'f',
            value: this.region_width,
          },
          region_height: {
            type: 'f',
            value: this.region_height,
          },
          neighbor_radius: {
            type: 'f',
            value: this.flocking_interface.neighbor_radius.value,
          },
        },
        targets: {
          neighbor_texture_1: {
            location: 0,
            target: this.neighbor_texture_0,
          },
          neighbor_texture_2: {
            location: 1,
            target: this.neighbor_texture_1,
          },
          neighbor_texture_3: {
            location: 2,
            target: this.neighbor_texture_2,
          },
          neighbor_texture_4: {
            location: 3,
            target: this.neighbor_texture_3,
          },
        },
      });
    }

    createAgentUpdateSolver() {
      this.agent_update_solver = new Abubu.Solver({
        fragmentShader: UpdateAgentsShader,
        uniforms: {
          num_agents: {
            type: 'i',
            value: this.flocking_interface.number_agents.value,
          },
          agents_texture: {
            type: 't',
            value: this.agents_texture,
          },
          velocity_texture: {
            type: 't',
            value: this.velocity_texture,
          },
          neighbor_texture_0: {
            type: 't',
            value: this.neighbor_texture_0,
          },
          neighbor_texture_1: {
            type: 't',
            value: this.neighbor_texture_1,
          },
          neighbor_texture_2: {
            type: 't',
            value: this.neighbor_texture_2,
          },
          neighbor_texture_3: {
            type: 't',
            value: this.neighbor_texture_3,
          },
          region_width: {
            type: 'f',
            value: this.region_width,
          },
          region_height: {
            type: 'f',
            value: this.region_height,
          },
          dt: {
            type: 'f',
            value: this.flocking_interface.dt.value,
          },
          vbar: {
            type: 'f',
            value: this.flocking_interface.vbar.value,
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
            type: 'v2',
            value: [0.0, 0.0],
          },
          neighbor_count: {
            type: 'i',
            value: this.flocking_interface.neighbor_count.value,
          },
        },
        targets: {
          agents_out_texture: {
            location: 0,
            target: this.agents_out_texture,
          },
          velocity_out_texture: {
            location: 1,
            target: this.velocity_out_texture,
          },
        },
      });
    }

    createAgentCopySolver() {
      this.agent_copy = new Abubu.Copy(this.agents_out_texture, this.agents_texture);
    }

    createVelocityCopySolver() {
      this.velocity_copy = new Abubu.Copy(this.velocity_out_texture, this.velocity_texture);
    }

    createAgentDisplaySolver() {
      this.agent_display = new Abubu.Solver({
        fragmentShader: DisplayAgentsShader,
        uniforms: {
          num_agents: {
            type: 'i',
            value: this.flocking_interface.number_agents.value,
          },
          agents_texture: {
            type: 't',
            value: this.agents_texture,
          },
          region_width: {
            type: 'f',
            value: this.region_width,
          },
          region_height: {
            type: 'f',
            value: this.region_height,
          },
        },
        canvas: this.display_canvas,
      });
    }

    createCheckCollisionsSolver() {
      this.check_collisions_solver = new Abubu.Solver({
        fragmentShader: CheckCollisionsShader,
        uniforms: {
          num_agents: {
            type: 'i',
            value: this.flocking_interface.number_agents.value,
          },
          agents_texture: {
            type: 't',
            value: this.agents_texture,
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

    updateAgentUpdateSolver() {
      this.agent_update_solver.uniforms.num_agents.value = this.flocking_interface.number_agents.value;
      this.agent_update_solver.uniforms.dt.value = this.flocking_interface.dt.value;
      this.agent_update_solver.uniforms.vbar.value = this.flocking_interface.vbar.value;
      this.agent_update_solver.uniforms.abar.value = this.flocking_interface.abar.value;
      this.agent_update_solver.uniforms.eta.value = this.flocking_interface.eta.value;
      this.agent_update_solver.uniforms.lambda.value = this.flocking_interface.lambda.value;
      this.agent_update_solver.uniforms.omega.value = this.flocking_interface.omega.value;
      this.agent_update_solver.uniforms.predator_constant.value = this.flocking_interface.predator_constant.value;
      this.agent_update_solver.uniforms.neighbor_count.value = this.flocking_interface.neighbor_count.value;
    }

    updateAgentDisplaySolver() {
      this.agent_display.uniforms.num_agents.value = this.flocking_interface.number_agents.value;
    }

    updateCheckCollisionsSolver() {
      this.check_collisions_solver.uniforms.num_agents.value = this.flocking_interface.number_agents.value;
      this.check_collisions_solver.uniforms.collision_distance.value = this.flocking_interface.collision_distance.value;
    }

    updateAllSolvers() {
      this.updateNeighborSolver();
      this.updateAgentUpdateSolver();
      this.updateAgentDisplaySolver();
      this.updateCheckCollisionsSolver();
    }

    createAllSolvers() {
      this.createNeighborSolver();
      this.createAgentUpdateSolver();
      this.createAgentCopySolver();
      this.createVelocityCopySolver();
      this.createAgentDisplaySolver();
      this.createCheckCollisionsSolver();
    }

    runOneIteration() {
      this.neighbor_solver.render();
      this.agent_update_solver.render();
      this.agent_copy.render();
      this.velocity_copy.render();
      this.agent_display.render();
      this.check_collisions_solver.render();
    }
  };
});
