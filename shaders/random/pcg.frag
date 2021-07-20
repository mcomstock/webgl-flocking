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

void main() {
    uvec4 texel = texture(random_state_in, cc);
    uint oldstate = texel.x;
    uint increment = texel.y;

    uint newstate = oldstate * multiplier + (increment | 1u);
    uint result = newstate;

    uint opbits = 4u;
    uint mask = 15u;
    uint rshift = (newstate >> 28u) & mask;
    result ^= result >> (4u + rshift);
    result *= multiplier;
    result ^= result >> ((2u * 32u + 2u) / 3u);

    random_state_out = uvec4(newstate, increment, 0, 0);
    random_value = vec4(float(result)/uint_max);
    // random_value = vec4(float(result));
}
