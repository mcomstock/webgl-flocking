#version 300 es

precision highp float;
precision highp int;

in vec2 cc;

uniform sampler2D agent_texture, velocity_texture;

uniform float dt;

layout (location = 0) out vec4 predicted_position_texture;

void main() {
    vec4 x_tex = texture(agent_texture, cc);
    vec4 v_tex = texture(velocity_texture, cc);

    predicted_position_texture = x_tex + (dt * v_tex);
}
