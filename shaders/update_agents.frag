#version 300 es

precision highp float;
precision highp int;

in vec2 cc;

uniform sampler2D agents_texture, velocity_texture;
uniform sampler2D neighbor_texture_0, neighbor_texture_1, neighbor_texture_2, neighbor_texture_3;

uniform float dt, vbar, abar, eta, lambda, omega, region_width, region_height, predator_constant;
uniform int num_agents, neighbor_count;
uniform bool predator_active;
uniform vec2 predator_position;

layout (location = 0) out vec4 agents_out_texture;
layout (location = 1) out vec4 velocity_out_texture;

// Hyperparameter for gradient descent
float gamma = 0.05;

int neighbors[16];

vec2 alternate_positions[8];

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

    vec2 v = vec2(v_tex.r, v_tex.g);
    vec2 x = vec2(x_tex.r, x_tex.g);

    vec4 n0_tex = texture(neighbor_texture_0, cc);
    vec4 n1_tex = texture(neighbor_texture_1, cc);
    vec4 n2_tex = texture(neighbor_texture_2, cc);
    vec4 n3_tex = texture(neighbor_texture_3, cc);

    neighbors[0] = int(n0_tex.r);
    neighbors[1] = int(n0_tex.g);
    neighbors[2] = int(n0_tex.b);
    neighbors[3] = int(n0_tex.a);
    neighbors[4] = int(n1_tex.r);
    neighbors[5] = int(n1_tex.g);
    neighbors[6] = int(n1_tex.b);
    neighbors[7] = int(n1_tex.a);
    neighbors[8] = int(n2_tex.r);
    neighbors[9] = int(n2_tex.g);
    neighbors[10] = int(n2_tex.b);
    neighbors[11] = int(n2_tex.a);
    neighbors[12] = int(n3_tex.r);
    neighbors[13] = int(n3_tex.g);
    neighbors[14] = int(n3_tex.b);
    neighbors[15] = int(n3_tex.a);

    int neighbors_to_check = min(neighbor_count, neighbors.length());

    // Use gradient descent to find the acceleration
    vec2 a = vec2(0.0, 0.0);
    for (int i = 0; i < 1000; ++i) {
        vec2 xi = x + dt * v + dt * dt * a;
        xi = vec2(mod(xi.x, region_width), mod(xi.y, region_height));

        alternate_positions[0] = xi + vec2(region_width, 0.0);
        alternate_positions[1] = xi + vec2(0.0, region_height);
        alternate_positions[2] = xi + vec2(region_width, region_height);
        alternate_positions[3] = xi + vec2(-1.0 * region_width, 0.0);
        alternate_positions[4] = xi + vec2(0.0, -1.0 * region_height);
        alternate_positions[5] = xi + vec2(-1.0 * region_width, -1.0 * region_height);
        alternate_positions[6] = xi + vec2(-1.0 * region_width, region_height);
        alternate_positions[7] = xi + vec2(region_height, -1.0 * region_height);

        vec2 xj = vec2(0.0, 0.0);
        vec2 aggregation = vec2(0.0, 0.0);
        vec2 separation = vec2(0.0, 0.0);
        int N = 0;
        for (int n = 0; n < neighbors_to_check; ++n) {
            if (neighbors[n] >= num_agents) {
                break;
            }

            // % 64
            int ind_x = neighbors[n] & 63;
            // / 64
            int ind_y = neighbors[n] >> 6;
            ivec2 n_index = ivec2(ind_x, ind_y);
            vec4 nx_tex = texelFetch(agents_texture, n_index, 0);
            vec4 nv_tex = texelFetch(velocity_texture, n_index, 0);

            vec2 nx = vec2(nx_tex.r, nx_tex.g);
            vec2 nv = vec2(nv_tex.r, nv_tex.g);

            xj = nx + dt * nv;
            xj = vec2(mod(xj.x, region_width), mod(xj.y, region_height));

            vec2 txi = xi;
            float d = distance(txi, xj);
            for (int pos = 0; pos < alternate_positions.length(); ++pos) {
                float ad = distance(alternate_positions[pos], xj);

                if (ad < d) {
                    txi = alternate_positions[pos];
                    d = ad;
                }
            }

            if (txi == xj) {
                continue;
            }

            ++N;

            vec2 xij = txi - xj;
            float sqdist = dot(xij, xij);

            vec2 dxij = 2.0 * xij * dt * dt;

            aggregation += dxij;
            separation += dxij / (sqdist * sqdist);
        }

        if (N == 0) {
            continue;
        }

        vec2 regularization = a;

        a -= gamma * (aggregation / float(N) - omega * separation + 2.0 * lambda * regularization);

        if (predator_active) {
            vec2 p = vec2(predator_position.x * region_width, predator_position.y * region_height);

            vec2 xip = xi - p;
            float sqdist = dot(xip, xip);
            a += gamma * predator_constant * 2.0 * xip * dt * dt / (sqdist * sqdist);
        }
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

    velocity_out_texture = vec4(v.x, v.y, 0.0, 0.0);
    agents_out_texture = vec4(mod(x.x, region_width), mod(x.y, region_height), 0.0, 0.0);
}
