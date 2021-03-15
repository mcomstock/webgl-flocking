#version 300 es

precision highp float;
precision highp int;

in vec2 cc;

uniform sampler2D agent_texture, velocity_texture;

uniform float dt, region_width, region_height, region_depth;
uniform int num_agents;

layout (location = 0) out vec4 agent_out_texture;

void main() {
    vec4 x = texture(agent_texture, cc);
    vec4 v = texture(velocity_texture, cc);

    int current_agent_x = int(floor(cc.x * 64.0));
    int current_agent_y = int(floor(cc.y * 64.0));
    int current_agent_idx = 64 * current_agent_y + current_agent_x;

    if (current_agent_idx >= num_agents) {
        agent_out_texture = x;
        return;
    }

    x += dt * v;

    agent_out_texture = vec4(
        mod(x.x + region_width, region_width),
        mod(x.y + region_height, region_height),
        mod(x.z + region_depth, region_depth),
        0.0
    );
}
