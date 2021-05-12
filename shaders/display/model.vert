#version 300 es

precision highp float;
precision highp int;

#define HALFLENGTH 0.1
#define HALFBASE 0.05
#define BACKTOP HALFBASE/sqrt(3.0)
#define BACKBOT HALFBASE*(sqrt(3.0) - 1.0/sqrt(3.0))

vec4 FRONTVERT = vec4(HALFLENGTH, 0.0, 0.0, 1.0);
vec4 BACK1VERT = vec4(-HALFLENGTH, -BACKTOP, 0.0, 1.0);
vec4 BACK2VERT = vec4(-HALFLENGTH, BACKBOT, -HALFBASE, 1.0);
vec4 BACK3VERT = vec4(-HALFLENGTH, BACKBOT, HALFBASE, 1.0);

//      B1 *_                -z  -y (-z is farther away)
//        / \ - _              \ |
//       /   \    - _ F         \|
//      /     \       *   -x ----+---- +x
//     /       \  _ -            |\
// B2 *---------* B3             | \
//                              +y  +z

uniform sampler2D position_texture, velocity_texture;
uniform mat4 u_matrix;

in vec3 position;

out vec3 color;
out vec3 normal;

vec4 offset[12];
vec3 colors[4];
vec3 normals[4];

vec3 up = vec3(0.0, 1.0, 0.0);

void main() {
    offset[0] = BACK1VERT;
    offset[1] = BACK2VERT;
    offset[2] = BACK3VERT;

    offset[3] = BACK2VERT;
    offset[4] = BACK1VERT;
    offset[5] = FRONTVERT;

    offset[6] = BACK3VERT;
    offset[7] = BACK2VERT;
    offset[8] = FRONTVERT;

    offset[9] = BACK1VERT;
    offset[10] = BACK3VERT;
    offset[11] = FRONTVERT;

    normals[0] = normalize(cross(normalize((offset[1] - offset[0]).xyz), (normalize(offset[2] - offset[1]).xyz)));
    normals[1] = normalize(cross(normalize((offset[4] - offset[3]).xyz), (normalize(offset[5] - offset[4]).xyz)));
    normals[2] = normalize(cross(normalize((offset[7] - offset[6]).xyz), (normalize(offset[8] - offset[7]).xyz)));
    normals[3] = normalize(cross(normalize((offset[10] - offset[9]).xyz), (normalize(offset[11] - offset[10]).xyz)));

    colors[0] = vec3(1.0, 0.0, 0.0);
    colors[1] = vec3(0.0, 1.0, 0.0);
    colors[2] = vec3(0.0, 0.0, 1.0);
    colors[3] = vec3(1.0, 1.0, 0.0);

    int vertnum = int(position.z);
    vec4 pos = vec4(texture(position_texture, position.xy).xyz, 1.0);
    vec4 vel = texture(velocity_texture, position.xy);

    vec4 lookx = vec4(normalize(vel.xyz), 0.0);
    vec4 lookz = vec4(normalize(cross(lookx.xyz, up)), 0.0);
    vec4 looky = vec4(normalize(cross(lookz.xyz, lookx.xyz)), 0.0);

    // The first 3x3 block of this matrix has columns that form an orthonormal basis (under
    // non-degenerate conditions) for a Cartesian plane rotated so that the y-axis is preserved and
    // the positive x-axis is facing the same direction as the bird. This means the xyz-coordinates
    // of the vertex are converted to this coordinate system through matrix multiplication. The
    // extra dimension is used to translate by the position of the bird.
    mat4 world_matrix = mat4(
        lookx,
        looky,
        lookz,
        pos
    );

    gl_Position = u_matrix * world_matrix * offset[vertnum];
    color = colors[vertnum/3];
    normal = mat3(world_matrix) * normals[vertnum/3];
}
