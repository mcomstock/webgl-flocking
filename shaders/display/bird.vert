precision highp float;
precision highp int;

attribute vec4 aVertexPosition;

// uniform mat4 uModelViewMatrix;
// uniform mat4 uProjectionMatrix;

void main() {
    gl_Position = vec4(aVertexPosition.x / 256.0 - 1.0, aVertexPosition.y / 256.0 - 1.0, 0.0, 1.0);
    gl_PointSize = 2.0;
}
