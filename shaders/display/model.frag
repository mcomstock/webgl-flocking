#version 300 es

precision highp float;
precision highp int;

in vec3 color;
in vec3 normal;
out vec4 outcolor;

vec3 revlightdir = normalize(vec3(0.0, 0.0, 1.0));

void main() {
    vec3 c = vec3(0.9, 0.9, 0.9);
    // vec3 c = color;
    float intensity = dot(normalize(normal), revlightdir);
    outcolor = vec4(intensity*c, 1.0);
}
