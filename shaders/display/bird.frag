#version 300 es

precision highp float;
precision highp int;

in float z_pos;

out vec4 outcolor;

void main() {
    outcolor = vec4(z_pos / 512.0, 0.0, 0.0, 1.0);
}
