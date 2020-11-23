#version 300 es

precision highp float;
precision highp int;

in vec2 cc;

uniform sampler2D agents_texture, velocity_texture, neighbor_texture;

uniform float dt, vbar, abar, eta, lambda, omega, region_width, region_height;

layout (location = 0) out vec4 agents_out_texture;
layout (location = 1) out vec4 velocity_out_texture;

// Hyperparameter for gradient descent
float gamma = 0.1;

int neighbors[4];

void main() {
    vec4 v_tex = texture(velocity_texture, cc);
    vec4 x_tex = texture(agents_texture, cc);

    vec2 v = vec2(v_tex.r, v_tex.g);
    vec2 x = vec2(x_tex.r, x_tex.g);
    vec2 x_rel = vec2(x_tex.r / region_width, x_tex.g / region_height);

    vec4 n_tex = texture(neighbor_texture, x_rel);

    neighbors[0] = int(n_tex.r);
    neighbors[1] = int(n_tex.g);
    neighbors[2] = int(n_tex.b);
    neighbors[3] = int(n_tex.a);

    // Use gradient descent to find the acceleration
    vec2 a = vec2(1.0, 1.0);
    float Ninv = 0.25;
    for (int i = 0; i < 1000; ++i) {
        vec2 xi = x + dt * v + dt * dt * a;

        vec2 xj = vec2(0.0, 0.0);
        vec2 aggregation = vec2(0.0, 0.0);
        vec2 separation = vec2(0.0, 0.0);
        for (int n = 0; n < 4; ++n) {
            ivec2 n_index = ivec2(neighbors[n], 0);
            vec4 nx_tex = texelFetch(agents_texture, n_index, 0);
            vec4 nv_tex = texelFetch(velocity_texture, n_index, 0);

            vec2 nx = vec2(nx_tex.r, nx_tex.g);
            vec2 nv = vec2(nv_tex.r, nv_tex.g);

            xj = nx + dt * nv;

            vec2 xij = xi - xj;
            float sqdist = dot(xij, xij);

            aggregation += Ninv * 2.0 * dt * dt * xij;
            separation += omega * xij * dt * dt / (sqdist * sqdist);
        }

        vec2 regularization = 2.0 * lambda * a;

        a -= gamma * (aggregation - separation + regularization);
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
    agents_out_texture = vec4(x.x, x.y, 0.0, 0.0);
}
