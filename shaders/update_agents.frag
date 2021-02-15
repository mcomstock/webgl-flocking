#version 300 es

precision highp float;
precision highp int;

in vec2 cc;

uniform sampler2D agents_texture, velocity_texture, predicted_position_texture;
uniform sampler2D neighbor_texture_0, neighbor_texture_1;

uniform float dt, vbar, abar, eta, lambda, omega, region_width, region_height, region_depth, predator_constant;
uniform int num_agents, neighbor_count;
uniform bool predator_active;
uniform vec3 predator_position;

layout (location = 0) out vec4 agents_out_texture;
layout (location = 1) out vec4 velocity_out_texture;

// Hyperparameter for gradient descent
float gamma = 0.05;

int neighbors[16];

vec3 walls[6];

// The range at which to start caring about the walls
float sq_wall_dist_range = 20.0 * 20.0;

void main() {
    vec4 v_tex = texture(velocity_texture, cc);
    vec4 x_tex = texture(agents_texture, cc);

    int current_agent_x = int(floor(cc.x * 64.0));
    int current_agent_y = int(floor(cc.y * 64.0));
    int current_agent_idx = 64 * current_agent_y + current_agent_x;

    if (current_agent_idx >= num_agents) {
        agents_out_texture = x_tex;
        velocity_out_texture = v_tex;
        return;
    }

    vec3 v = v_tex.xyz;
    vec3 x = x_tex.xyz;

    vec4 n0_tex = texture(neighbor_texture_0, cc);
    vec4 n1_tex = texture(neighbor_texture_1, cc);

    neighbors[0] = int(floatBitsToInt(n0_tex.r) & 65535);
    neighbors[1] = int(floatBitsToInt(n0_tex.r) >> 16);
    neighbors[2] = int(floatBitsToInt(n0_tex.g) & 65535);
    neighbors[3] = int(floatBitsToInt(n0_tex.g) >> 16);
    neighbors[4] = int(floatBitsToInt(n0_tex.b) & 65535);
    neighbors[5] = int(floatBitsToInt(n0_tex.b) >> 16);
    neighbors[6] = int(floatBitsToInt(n0_tex.a) & 65535);
    neighbors[7] = int(floatBitsToInt(n0_tex.a) >> 16);
    neighbors[8] = int(floatBitsToInt(n1_tex.r) & 65535);
    neighbors[9] = int(floatBitsToInt(n1_tex.r) >> 16);
    neighbors[10] = int(floatBitsToInt(n1_tex.g) & 65535);
    neighbors[11] = int(floatBitsToInt(n1_tex.g) >> 16);
    neighbors[12] = int(floatBitsToInt(n1_tex.b) & 65535);
    neighbors[13] = int(floatBitsToInt(n1_tex.b) >> 16);
    neighbors[14] = int(floatBitsToInt(n1_tex.a) & 65535);
    neighbors[15] = int(floatBitsToInt(n1_tex.a) >> 16);

    int neighbors_to_check = min(neighbor_count, neighbors.length());
    int num_walls = walls.length();

    vec3 predator = predator_position.xyz * vec3(region_width, region_height, region_depth);

    // Use gradient descent to find the acceleration
    vec3 a = vec3(0.0);
    for (int i = 0; i < 1000; ++i) {
        vec3 xi = x + dt * v + dt * dt * a;

        // Nearest position on each wall
        walls[0] = vec3(0.0, xi.y, xi.z);
        walls[1] = vec3(region_width, xi.y, xi.z);
        walls[2] = vec3(xi.x, 0.0, xi.z);
        walls[3] = vec3(xi.x, region_height, xi.z);
        walls[4] = vec3(xi.x, xi.y, 0.0);
        walls[5] = vec3(xi.x, xi.y, region_depth);

        vec3 xj = vec3(0.0);
        vec3 aggregation = vec3(0.0);
        vec3 separation = vec3(0.0);
        int N = 0;
        for (int n = 0; n < neighbors_to_check; ++n) {
            if (neighbors[n] >= num_agents) {
                break;
            }

            // % 64
            int ind_x = neighbors[n] & 63;
            // / 64
            int ind_y = neighbors[n] >> 6;
            xj = texelFetch(predicted_position_texture, ivec2(ind_x, ind_y), 0).xyz;

            if (xi == xj) {
                continue;
            }

            ++N;

            vec3 xij = xi - xj;
            float sqdist = dot(xij, xij);

            vec3 dxij = 2.0 * xij * dt * dt;

            aggregation += dxij;
            separation += dxij / (sqdist * sqdist);
        }

        if (N != 0) {
            vec3 regularization = a;
            a -= (aggregation / float(N) - omega * separation + 2.0 * lambda * regularization);
        }

        // Avoid the walls if too close
        for (int w = 0; w < num_walls; ++w) {
            vec3 w_dist = xi - walls[w];
            float sq_w_dist = dot(w_dist, w_dist);

            if (sq_w_dist < sq_wall_dist_range) {
                a += predator_constant * 2.0 * w_dist * dt * dt / (sq_w_dist * sq_w_dist);
            }
        }

        // Avoid the predator
        if (predator_active) {
            vec3 xip = xi - predator;
            float sqdist = dot(xip, xip);
            a += predator_constant * 2.0 * xip * dt * dt / (sqdist * sqdist);
        }

        a = gamma * a;
    }

    // Update the velocity and position
    if (length(a) > abar) {
        a = normalize(a) * abar;
    }

    v += dt * a;

    if (length(v) > vbar) {
        v = normalize(v) * vbar;
    }

    x += dt * v;

    velocity_out_texture = vec4(v.x, v.y, v.z, 0.0);

    agents_out_texture = vec4(
        mod(x.x + region_width, region_width),
        mod(x.y + region_height, region_height),
        mod(x.z + region_depth, region_depth),
        0.0
    );
}
