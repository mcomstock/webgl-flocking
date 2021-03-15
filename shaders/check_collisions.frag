#version 300 es

precision highp float;
precision highp int;
precision highp usampler2D;

in vec2 cc;

uniform sampler2D agent_texture;
uniform usampler2D neighbor_texture_0;

uniform int num_agents;
uniform float region_width, region_height, collision_distance;

layout (location = 0) out vec4 collision_texture;
// layout (location = 1) out vec4 first_neighbor;

void main() {
    collision_texture = vec4(0.0, 0.0, 0.0, 0.0);

    int current_agent_x = int(floor(cc.x * 64.0));
    int current_agent_y = int(floor(cc.y * 64.0));
    int current_agent_idx = 64 * current_agent_y + current_agent_x;

    if (current_agent_idx >= num_agents) {
        return;
    }

    vec4 x_tex = texture(agent_texture, cc);
    uvec4 n_tex = texture(neighbor_texture_0, cc);

    // Only compare with the nearest neighbor
    int n_ind = int(n_tex.r & 65535u);

    if (n_ind >= num_agents) {
        return;
    }

    int n_ind_x = n_ind & 63;
    int n_ind_y = n_ind >> 6;

    vec4 n = texelFetch(agent_texture, ivec2(n_ind_x, n_ind_y), 0);

    // first_neighbor = vec4(n_ind);

    if (distance(x_tex, n) < collision_distance) {
        collision_texture = vec4(1.0, 0.0, 0.0, 0.0);
    }
}
