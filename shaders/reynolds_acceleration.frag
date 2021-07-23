#version 300 es

precision highp float;
precision highp int;
precision highp usampler2D;

in vec2 cc;

uniform sampler2D position_texture, velocity_texture;
uniform usampler2D neighbor_texture_0, neighbor_texture_1;

uniform int num_agents;

layout (location = 0) out vec4 acceleration_texture;

int neighbors[16];

void main() {
    // x is the position of the current boid
    vec3 x = texture(position_texture, cc).xyz;
    // v is the velocity of the current boid
    vec3 v = texture(velocity_texture, cc).xyz;

    // Check to make sure the current boid is part of the simulation. If it is not, return right
    // away.
    int current_agent_x = int(floor(cc.x * 64.0));
    int current_agent_y = int(floor(cc.y * 64.0));
    int current_agent_idx = 64 * current_agent_y + current_agent_x;

    if (current_agent_idx >= num_agents) {
        return;
    }

    // Unpack the neighbors into an array. They are sorted by distance, with the first neighbor
    // being the closest.
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

    // TODO: This is where the acceleration should be computed

    // Set the acceleration value for this bird
    acceleration_texture = vec4(0.0);
}
