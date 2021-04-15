#version 300 es

precision highp float;
precision highp int;

in vec3 color;
out vec4 outcolor;

void main() {
    outcolor = vec4(color, 1.0);
}
