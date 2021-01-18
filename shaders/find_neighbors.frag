#version 300 es

precision highp float;
precision highp int;

in vec2 cc;

uniform int num_agents;
uniform float region_width, region_height, neighbor_radius;
uniform sampler2D agents_texture;

#define BIG_FLOAT 1.0e+10

layout (location = 0) out vec4 neighbor_texture_0;
layout (location = 1) out vec4 neighbor_texture_1;
layout (location = 2) out vec4 neighbor_texture_2;
layout (location = 3) out vec4 neighbor_texture_3;

float neighbors[16];
float distances[16];

void main() {
    for (int i = 0; i < neighbors.length(); ++i) {
        neighbors[i] = float(num_agents);
        distances[i] = BIG_FLOAT;
    }

    vec4 current_agent_tex = texture(agents_texture, cc);
    vec2 current_agent_pos = vec2(current_agent_tex.r, current_agent_tex.g);

    int current_agent_x = int(floor(cc.x * 64.0));
    int current_agent_y = int(floor(cc.y * 64.0));
    int current_agent_idx = 64 * current_agent_y + current_agent_x;

    if (current_agent_idx >= num_agents) {
        neighbor_texture_0 = vec4(num_agents, num_agents, num_agents, num_agents);
        neighbor_texture_1 = vec4(num_agents, num_agents, num_agents, num_agents);
        neighbor_texture_2 = vec4(num_agents, num_agents, num_agents, num_agents);
        neighbor_texture_3 = vec4(num_agents, num_agents, num_agents, num_agents);
        return;
    }

    for (int i = 0; i < num_agents; ++i) {
        // The agent should not have itself as a neighbor
        if (i == current_agent_idx) {
            continue;
        }

        // % 64
        int i_x = i & 63;
        // / 64
        int i_y = i >> 6;
        vec4 agent_texel = texelFetch(agents_texture, ivec2(i_x, i_y), 0);
        vec2 agent_pos = vec2(agent_texel.r, agent_texel.g);

        float d = distance(current_agent_pos, agent_pos);

        if (d > neighbor_radius) {
            continue;
        }

        for (int j = 0; j < neighbors.length(); ++j) {
            if (d < distances[j]) {
                for (int k = neighbors.length() - 1; k > j; --k) {
                    neighbors[k] = neighbors[k-1];
                    distances[k] = distances[k-1];
                }

                neighbors[j] = float(i);
                distances[j] = d;

                break;
            }
        }
    }

    neighbor_texture_0 = vec4(neighbors[0], neighbors[1], neighbors[2], neighbors[3]);
    neighbor_texture_1 = vec4(neighbors[4], neighbors[5], neighbors[6], neighbors[7]);
    neighbor_texture_2 = vec4(neighbors[8], neighbors[9], neighbors[10], neighbors[11]);
    neighbor_texture_3 = vec4(neighbors[12], neighbors[13], neighbors[14], neighbors[15]);
}
