#version 300 es

precision highp float;
precision highp int;

in vec2 cc;

uniform sampler2D agents_texture;
uniform sampler2D neighbor_texture_0;

uniform int num_agents;
uniform float region_width, region_height, collision_distance;

layout (location = 0) out vec4 collision_texture;

void main() {
    collision_texture = vec4(0.0, 0.0, 0.0, 0.0);

    int current_agent_x = int(floor(cc.x * 64.0));
    int current_agent_y = int(floor(cc.y * 64.0));
    int current_agent_idx = 64 * current_agent_y + current_agent_x;

    if (current_agent_idx >= num_agents) {
        return;
    }

    vec4 x_tex = texture(agents_texture, cc);
    vec4 n_tex = texture(neighbor_texture_0, cc);

    vec2 x = vec2(x_tex.r, x_tex.g);

    // Only compare with the nearest neighbor
    int n_ind = int(n_tex.r);

    if (n_ind >= num_agents) {
        return;
    }

    int n_ind_x = n_ind & 63;
    int n_ind_y = n_ind >> 6;

    vec4 n = texelFetch(agents_texture, ivec2(n_ind_x, n_ind_y), 0);
    vec2 nx = vec2(n.r, n.g);

    if (distance(x, nx) < collision_distance) {
        collision_texture = vec4(1.0, 0.0, 0.0, 0.0);
    }
}
