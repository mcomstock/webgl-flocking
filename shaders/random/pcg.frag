#version 300 es

/*
 * This is an attempt at an implementation of the PCG random number generator described here:
 * https://www.pcg-random.org/
 *
 * Specifically, I use the 32-bit output and state (PCG-RXS-M-XS) due to the limitations of shader
 * code.
 */

precision highp float;
precision highp int;
precision highp usampler2D;

in vec2 cc;

uniform usampler2D random_state_in;

layout (location = 0) out uvec4 random_state_out;
layout (location = 1) out vec4 random_value;

uint multiplier = 277803737u;
float uint_max = 4294967295.0;

vec4 results = vec4(0.0);

void main() {
    uvec4 texel = texture(random_state_in, cc);
    uint state = texel.x;
    uint increment = texel.y;

    for (int i = 0; i < 3; ++i) {
        state = state * multiplier + (increment | 1u);
        uint result = state;

        uint opbits = 4u;
        uint mask = 15u;
        uint rshift = (state >> 28u) & mask;
        result ^= result >> (4u + rshift);
        result *= multiplier;
        result ^= result >> ((2u * 32u + 2u) / 3u);

        results[i] = float(result);
    }

    random_state_out = uvec4(state, increment, 0, 0);
    random_value = results / uint_max;
}
