#version 300 es

precision highp float;
precision highp int;

in vec2 cc;

uniform sampler2D velocity_texture, acceleration_texture;

uniform float dt, vbar, vmin;
uniform int num_agents;

layout (location = 0) out vec4 velocity_out_texture;

void main() {
    vec4 v = texture(velocity_texture, cc);
    vec4 a = texture(acceleration_texture, cc);

    int current_agent_x = int(floor(cc.x * 64.0));
    int current_agent_y = int(floor(cc.y * 64.0));
    int current_agent_idx = 64 * current_agent_y + current_agent_x;

    if (current_agent_idx >= num_agents) {
        velocity_out_texture = v;
        return;
    }

    v += dt * a;

    if (length(v) > vbar) {
        v = normalize(v) * vbar;
    } else if (length(v) != 0.0 && length(v) < vmin) {
        v = normalize(v) * vmin;
    }

    velocity_out_texture = v;
}
