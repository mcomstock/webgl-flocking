#version 300 es

precision highp float;
precision highp int;

in vec2 cc;

uniform int num_agents;
uniform float region_width, region_height;
uniform sampler2D agents_texture;

#define BIG_FLOAT 1.0e+10

layout (location = 0) out vec4 neighbor_texture;

float neighbors[5];
float distances[5];

void main() {
    for (int i = 0; i < neighbors.length(); ++i) {
        neighbors[i] = float(num_agents);
        distances[i] = BIG_FLOAT;
    }

    vec2 current_pos = vec2(region_width * cc.x, region_height * cc.y);

    for (int i = 0; i < num_agents; ++i) {
        vec4 agent_texel = texelFetch(agents_texture, ivec2(i,0), 0);
        vec2 agent_pos = vec2(mod(agent_texel.r, region_width), mod(agent_texel.g, region_height));

        float d = distance(current_pos, agent_pos);

        for (int j = 0; j < neighbors.length(); ++j) {
            if (d < distances[j]) {
                for (int k = neighbors.length() - 1; k > j; --k) {
                    neighbors[k] = neighbors[k-1];
                    distances[k] = distances[k-1];
                }

                neighbors[j] = float(i);
                distances[j] = d;

                continue;
            }
        }
    }

    neighbor_texture = vec4(neighbors[1], neighbors[2], neighbors[3], neighbors[4]);
}
