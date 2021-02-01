#version 300 es

precision highp float;
precision highp int;

in vec4 aVertexPosition;

void main() {
    gl_Position = vec4(aVertexPosition.x / 256.0 - 1.0, aVertexPosition.y / 256.0 - 1.0, aVertexPosition.z / 256.0 - 1.0, 1.0);
    gl_PointSize = 2.0;
}
