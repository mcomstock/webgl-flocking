#version 300 es

precision highp float;
precision highp int;
precision highp sampler2D;
precision highp usampler2D;

in vec2 cc;

uniform sampler2D position_texture, velocity_texture;
uniform usampler2D neighbor_texture_0, neighbor_texture_1;

uniform int num_agents, neighbor_count;

layout (location = 0) out uvec4 leader;

int neighbors[16];

void main() {
    leader = uvec4(0);

    int current_agent_x = int(floor(cc.x * 64.0));
    int current_agent_y = int(floor(cc.y * 64.0));
    int current_agent_idx = 64 * current_agent_y + current_agent_x;

    if (current_agent_idx >= num_agents) {
        return;
    }

    vec3 position = texture(position_texture, cc).xyz;
    vec3 velocity = texture(velocity_texture, cc).xyz;

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

    int neighbors_to_check = min(neighbor_count, neighbors.length());

    uint is_leader = 1u;
    for (int i = 0; i < neighbors_to_check; ++i) {
        if (neighbors[i] >= num_agents) {
            break;
        }
        int ind_x = neighbors[i] & 63;
        int ind_y = neighbors[i] >> 6;
        vec3 nx = texelFetch(position_texture, ivec2(ind_x, ind_y), 0).xyz;

        if (dot(nx, velocity) > dot(position, velocity)) {
            is_leader = 0u;
            break;
        }
    }

    leader.x = is_leader;
}
