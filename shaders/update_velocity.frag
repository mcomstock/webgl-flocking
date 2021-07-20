#version 300 es

precision highp float;
precision highp int;

in vec2 cc;

uniform sampler2D velocity_texture, acceleration_texture, random_texture;

uniform float dt, vbar, vmin, random_magnitude;
uniform int num_agents;

layout (location = 0) out vec4 velocity_out_texture;

void main() {
    vec3 v = texture(velocity_texture, cc).xyz;
    vec3 a = texture(acceleration_texture, cc).xyz;
    vec3 rand = texture(random_texture, cc).xyz;

    // The entries of rand start out in [0, 1], so rescale.
    rand = random_magnitude * normalize(rand - 0.5);

    int current_agent_x = int(floor(cc.x * 64.0));
    int current_agent_y = int(floor(cc.y * 64.0));
    int current_agent_idx = 64 * current_agent_y + current_agent_x;

    if (current_agent_idx >= num_agents) {
        velocity_out_texture = vec4(v, 1.0);
        return;
    }

    v += dt * (a + rand);

    if (length(v) > vbar) {
        v = normalize(v) * vbar;
    } else if (length(v) != 0.0 && length(v) < vmin) {
        v = normalize(v) * vmin;
    }

    velocity_out_texture = vec4(v, 1.0);
}
