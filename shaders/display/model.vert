#version 300 es

precision highp float;
precision highp int;

#define HALFLENGTH 0.01
#define HALFBASE 0.01
#define ZBACKWARD HALFBASE/sqrt(3.0)
#define ZFORWARD HALFBASE*(sqrt(3.0) - 1.0/sqrt(3.0))

vec3 FRONTVERT = vec3(HALFLENGTH, 0.0, 0.0);
vec3 BACK1VERT = vec3(-HALFLENGTH, 0.0, -ZFORWARD);
vec3 BACK2VERT = vec3(-HALFLENGTH, -HALFBASE, ZBACKWARD);
vec3 BACK3VERT = vec3(-HALFLENGTH, HALFBASE, ZBACKWARD);

uniform sampler2D position_texture, velocity_texture;

in vec3 position;

out vec3 color;

vec3 offset[12];
vec3 colors[12];

vec3 region = vec3(256.0, 256.0, 256.0);

void main() {
    offset[0] = BACK1VERT;
    offset[1] = BACK2VERT;
    offset[2] = BACK3VERT;

    offset[3] = BACK1VERT;
    offset[4] = BACK2VERT;
    offset[5] = FRONTVERT;

    offset[6] = BACK2VERT;
    offset[7] = BACK3VERT;
    offset[8] = FRONTVERT;

    offset[9] = BACK1VERT;
    offset[10] = BACK3VERT;
    offset[11] = FRONTVERT;

    colors[0] = vec3(1.0, 0.0, 0.0);
    colors[1] = vec3(1.0, 0.0, 0.0);
    colors[2] = vec3(1.0, 0.0, 0.0);

    colors[3] = vec3(0.0, 1.0, 0.0);
    colors[4] = vec3(0.0, 1.0, 0.0);
    colors[5] = vec3(0.0, 1.0, 0.0);

    colors[6] = vec3(0.0, 0.0, 1.0);
    colors[7] = vec3(0.0, 0.0, 1.0);
    colors[8] = vec3(0.0, 0.0, 1.0);

    colors[9] = vec3(1.0, 1.0, 0.0);
    colors[10] = vec3(1.0, 1.0, 0.0);
    colors[11] = vec3(1.0, 1.0, 0.0);

    int vertnum = int(position.z);
    vec3 pos = texture(position_texture, position.xy).xyz / region - 1.0;
    vec3 vel = texture(velocity_texture, position.xy).xyz;

    vec2 xydir = normalize(vel.xy);
    vec2 xzdir = normalize(vel.xz);
    vec2 yzdir = normalize(vel.yz);

    // mat3 rx = mat3(
    //     1.0, 0.0, 0.0,
    //     0.0, yzdir.x, yzdir.y,
    //     0.0, -yzdir.y, yzdir.x
    // );

    mat3 ry = mat3(
        xzdir.x, 0.0, -xzdir.y,
        0.0, 1.0, 0.0,
        xzdir.y, 0.0, xzdir.x
    );

    mat3 rz = mat3(
        xydir.x, xydir.y, 0.0,
        -xydir.y, xydir.x, 0.0,
        0.0, 0.0, 1.0
    );

    mat3 correct = mat3(
        sign(sign(xydir.x)+0.1)*1.0, 0.0, 0.0,
        0.0, 1.0, 0.0,
        0.0, 0.0, 1.0
    );

    vec3 rotated = correct*ry*rz*offset[vertnum];

    pos += rotated;

    gl_Position = vec4(pos, 1.0);
    color = colors[vertnum];
}
