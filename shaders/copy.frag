#version 300 es

precision highp int;
precision highp float;

uniform sampler2D original;

in vec2 cc;

layout (location = 0) out vec4 copy;

void main() {
    copy = texture(original, cc);
}
