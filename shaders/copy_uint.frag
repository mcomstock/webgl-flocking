#version 300 es

precision highp int;
precision highp float;
precision highp usampler2D;

uniform usampler2D original;

in vec2 cc;

layout (location = 0) out uvec4 copy;

void main() {
    copy = texture(original, cc);
}
