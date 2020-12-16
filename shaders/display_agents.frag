#version 300 es

precision highp float;
precision highp int;

in vec2 cc;

out vec4 outcolor;

uniform int num_agents;
uniform float region_width, region_height;
uniform sampler2D agents_texture;

void main() {
    outcolor = vec4(1.0, 1.0, 1.0, 1.0);

    vec2 current_pos = vec2(region_width * cc.x, region_height * cc.y);

    for (int i = 0; i < num_agents; ++i) {
        vec4 agent_texel = texelFetch(agents_texture, ivec2(i,0), 0);
        vec2 agent_pos = vec2(mod(agent_texel.r, region_width), mod(agent_texel.g, region_height));

        float dist = distance(current_pos, agent_pos);

        if (dist < 1.0) {
            outcolor = vec4(0.0, 0.0, 0.0, 1.0);
            return;
        }
    }
}
