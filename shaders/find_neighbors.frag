#version 300 es

precision highp float;
precision highp int;

in vec2 cc;

uniform int num_agents;
uniform float neighbor_radius;
uniform sampler2D agents_texture;

#define BIG_FLOAT 1.0e+10

layout (location = 0) out vec4 neighbor_texture_0;
layout (location = 1) out vec4 neighbor_texture_1;

int neighbors[16];
float distances[16];

void main() {
    for (int i = 0; i < neighbors.length(); ++i) {
        neighbors[i] = num_agents;
        distances[i] = BIG_FLOAT;
    }

    vec4 current_agent_tex = texture(agents_texture, cc);
    vec3 current_agent_pos = current_agent_tex.xyz;

    int current_agent_x = int(floor(cc.x * 64.0));
    int current_agent_y = int(floor(cc.y * 64.0));
    int current_agent_idx = 64 * current_agent_y + current_agent_x;

    if (current_agent_idx >= num_agents) {
        float num_agents_packed = intBitsToFloat((num_agents << 16) | num_agents);

        neighbor_texture_0 = vec4(num_agents_packed, num_agents_packed, num_agents_packed, num_agents_packed);
        neighbor_texture_1 = vec4(num_agents_packed, num_agents_packed, num_agents_packed, num_agents_packed);
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
        vec3 agent_pos = agent_texel.xyz;

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

                neighbors[j] = i;
                distances[j] = d;

                break;
            }
        }
    }

    neighbor_texture_0 = vec4(
        intBitsToFloat((neighbors[1] << 16) | neighbors[0]),
        intBitsToFloat((neighbors[3] << 16) | neighbors[2]),
        intBitsToFloat((neighbors[5] << 16) | neighbors[4]),
        intBitsToFloat((neighbors[7] << 16) | neighbors[6])
    );

    neighbor_texture_1 = vec4(
        intBitsToFloat((neighbors[9] << 16) | neighbors[8]),
        intBitsToFloat((neighbors[11] << 16) | neighbors[10]),
        intBitsToFloat((neighbors[13] << 16) | neighbors[12]),
        intBitsToFloat((neighbors[15] << 16) | neighbors[14])
    );
}
