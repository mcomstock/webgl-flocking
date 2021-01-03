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

    setEnv(env) {
      this.env = env;
    }

    updateFromInterface() {
      this.region_canvas = this.flocking_interface.region_canvas;
      this.region_width = FlockingInterface.getWidth(this.region_canvas);
      this.region_height = FlockingInterface.getHeight(this.region_canvas);
      this.agent_canvas = this.flocking_interface.agent_canvas;
      this.num_agents = FlockingInterface.getWidth(this.agent_canvas);
      this.display_canvas = this.flocking_interface.display_canvas;

      this.x_min = parseFloat(this.flocking_interface.x_min.value);
      this.x_max = parseFloat(this.flocking_interface.x_max.value);
      this.y_min = parseFloat(this.flocking_interface.y_min.value);
      this.y_max = parseFloat(this.flocking_interface.y_max.value);
    }

    createAgentTextures() {
      this.agents_texture = new Abubu.Float32Texture(this.num_agents, 1, { pairable: true });
      this.agents_out_texture = new Abubu.Float32Texture(this.num_agents, 1, { pairable: true });

      this.velocity_texture = new Abubu.Float32Texture(this.num_agents, 1, { pairable: true });
      this.velocity_out_texture = new Abubu.Float32Texture(this.num_agents, 1, { pairable: true });

      this.collision_texture = new Abubu.Float32Texture(this.num_agents, 1, { pariable: true });
    }

    createNeighborTextures() {
      this.neighbor_texture_0 = new Abubu.Float32Texture(this.region_width, this.region_height, { pairable: true });
      this.neighbor_texture_1 = new Abubu.Float32Texture(this.region_width, this.region_height, { pairable: true });
      this.neighbor_texture_2 = new Abubu.Float32Texture(this.region_width, this.region_height, { pairable: true });
      this.neighbor_texture_3 = new Abubu.Float32Texture(this.region_width, this.region_height, { pairable: true });
    }

    initializeAgents() {
      var agent_array = new Float32Array(this.num_agents * 4);
      var velocity_array = new Float32Array(this.num_agents * 4);

      var p = 0;
      for (var i = 0; i < this.num_agents; ++i) {
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
            value: this.num_agents,
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
            value: this.env.neighbor.neighbor_radius,
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
        canvas: this.region_canvas,
      });
    }

    createAgentUpdateSolver() {
      this.agent_update_solver = new Abubu.Solver({
        fragmentShader: UpdateAgentsShader,
        uniforms: {
          num_agents: {
            type: 'i',
            value: this.num_agents,
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
            value: this.env.model.dt,
          },
          vbar: {
            type: 'f',
            value: this.env.model.vbar,
          },
          abar: {
            type: 'f',
            value: this.env.model.abar,
          },
          eta: {
            type: 'f',
            value: this.env.model.eta,
          },
          lambda: {
            type: 'f',
            value: this.env.model.lambda,
          },
          omega: {
            type: 'f',
            value: this.env.model.omega,
          },
          predator_constant: {
            type: 'f',
            value: this.env.model.predator_constant,
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
            value: this.env.model.neighbor_count,
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
        canvas: this.agent_canvas,
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
            value: this.num_agents,
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
          agents_texture: {
            type: 't',
            value: this.agents_texture,
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
          collision_distance: {
            type: 'f',
            value: this.env.collisions.collision_distance,
          },
        },
        targets: {
          collision_texture: {
            location: 0,
            target: this.collision_texture,
          },
        },
        canvas: this.agent_canvas,
      });
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
