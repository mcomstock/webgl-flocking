#version 300 es

precision highp float;
precision highp int;
precision highp usampler2D;

in vec2 cc;

uniform sampler2D predicted_position_texture;
uniform usampler2D neighbor_texture_0, neighbor_texture_1;

uniform float dt, abar, eta, lambda, omega, region_width, region_height, region_depth, predator_constant;
uniform int num_agents, neighbor_count;
uniform bool predator_active;
uniform vec3 predator_position;

layout (location = 0) out vec4 acceleration_texture;
layout (location = 1) out vec4 first_neighbor;

// Hyperparameter for gradient descent
float gamma = 0.05;

int neighbors[16];

vec3 walls[6];

// The range at which to start caring about the walls
float sq_wall_dist_range = 20.0 * 20.0;

void main() {
    vec3 x = texture(predicted_position_texture, cc).xyz;

    int current_agent_x = int(floor(cc.x * 64.0));
    int current_agent_y = int(floor(cc.y * 64.0));
    int current_agent_idx = 64 * current_agent_y + current_agent_x;

    if (current_agent_idx >= num_agents) {
        return;
    }

    uvec4 n0_tex = texture(neighbor_texture_0, cc);
    uvec4 n1_tex = texture(neighbor_texture_1, cc);

    neighbors[0] = int(n0_tex.r & 65535u);
    neighbors[1] = int(n0_tex.r >> 16);
    neighbors[2] = int(n0_tex.g & 65535u);
    neighbors[3] = int(n0_tex.g >> 16);
    neighbors[4] = int(n0_tex.b & 65535u);
    neighbors[5] = int(n0_tex.b >> 16);
    neighbors[6] = int(n0_tex.a & 65535u);
    neighbors[7] = int(n0_tex.a >> 16);
    neighbors[8] = int(n1_tex.r & 65535u);
    neighbors[9] = int(n1_tex.r >> 16);
    neighbors[10] = int(n1_tex.g & 65535u);
    neighbors[11] = int(n1_tex.g >> 16);
    neighbors[12] = int(n1_tex.b & 65535u);
    neighbors[13] = int(n1_tex.b >> 16);
    neighbors[14] = int(n1_tex.a & 65535u);
    neighbors[15] = int(n1_tex.a >> 16);

    first_neighbor = vec4(x, 0.0);

    int neighbors_to_check = min(neighbor_count, neighbors.length());
    int num_walls = walls.length();

    vec3 predator = predator_position.xyz * vec3(region_width, region_height, region_depth);

    // Use gradient descent to find the acceleration
    vec3 a = vec3(0.0);
    for (int i = 0; i < 1000; ++i) {
        vec3 xi = x + dt * dt * a;

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
            a -= gamma * (aggregation / float(N) - omega * separation + 2.0 * lambda * regularization);
        }

        // Avoid the walls if too close
        for (int w = 0; w < num_walls; ++w) {
            vec3 w_dist = xi - walls[w];
            float sq_w_dist = dot(w_dist, w_dist);

            if (sq_w_dist < sq_wall_dist_range) {
                a += gamma * predator_constant * 2.0 * w_dist * dt * dt / (sq_w_dist * sq_w_dist);
            }
        }

        // Avoid the predator
        if (predator_active) {
            vec3 xip = xi - predator;
            float sqdist = dot(xip, xip);
            a += gamma * predator_constant * 2.0 * xip * dt * dt / (sqdist * sqdist);
        }
    }

    if (length(a) > abar) {
        a = normalize(a) * abar;
    }

    acceleration_texture = vec4(a, 0.0);
}
