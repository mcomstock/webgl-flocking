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

vec2 alternate_positions[8];

void main() {
    for (int i = 0; i < neighbors.length(); ++i) {
        neighbors[i] = float(num_agents);
        distances[i] = BIG_FLOAT;
    }

    vec2 current_pos = vec2(region_width * cc.x, region_height * cc.y);
    alternate_positions[0] = current_pos + vec2(region_width, 0.0);
    alternate_positions[1] = current_pos + vec2(0.0, region_height);
    alternate_positions[2] = current_pos + vec2(region_width, region_height);
    alternate_positions[3] = current_pos + vec2(-1.0 * region_width, 0.0);
    alternate_positions[4] = current_pos + vec2(0.0, -1.0 * region_height);
    alternate_positions[5] = current_pos + vec2(-1.0 * region_width, -1.0 * region_height);
    alternate_positions[6] = current_pos + vec2(-1.0 * region_width, region_height);
    alternate_positions[7] = current_pos + vec2(region_height, -1.0 * region_height);

    for (int i = 0; i < num_agents; ++i) {
        vec4 agent_texel = texelFetch(agents_texture, ivec2(i,0), 0);
        vec2 agent_pos = vec2(agent_texel.r, agent_texel.g);

        float d = distance(current_pos, agent_pos);
        for (int pos = 0; pos < alternate_positions.length(); ++pos) {
            float ad = distance(alternate_positions[pos], agent_pos);
            d = min(d, ad);
        }

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
