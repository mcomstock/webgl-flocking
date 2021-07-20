#version 300 es

precision highp float;
precision highp int;

in vec3 color;
in float intensity;
out vec4 outcolor;

void main() {
    vec3 c = vec3(0.9, 0.9, 0.9);
    // vec3 c = color;
    outcolor = vec4(intensity*c, 1.0);
}
