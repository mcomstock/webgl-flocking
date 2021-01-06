#version 300 es

precision highp float;
precision highp int;

in vec2 cc;

uniform sampler2D agents_texture;
uniform sampler2D neighbor_texture_0, neighbor_texture_1, neighbor_texture_2, neighbor_texture_3;

uniform float region_width, region_height, collision_distance;

layout (location = 0) out vec4 collision_texture;

int neighbors[16];

void main() {
    collision_texture = vec4(0.0, 0.0, 0.0, 0.0);

    vec4 x_tex = texture(agents_texture, cc);
    vec2 x_rel = vec2(mod(x_tex.r, region_width) / region_width, mod(x_tex.g, region_height) / region_height);

    vec4 n0_tex = texture(neighbor_texture_0, x_rel);
    vec4 n1_tex = texture(neighbor_texture_1, x_rel);
    vec4 n2_tex = texture(neighbor_texture_2, x_rel);
    vec4 n3_tex = texture(neighbor_texture_3, x_rel);

    neighbors[0] = int(n0_tex.r);
    neighbors[1] = int(n0_tex.g);
    neighbors[2] = int(n0_tex.b);
    neighbors[3] = int(n0_tex.a);
    neighbors[4] = int(n1_tex.r);
    neighbors[5] = int(n1_tex.g);
    neighbors[6] = int(n1_tex.b);
    neighbors[7] = int(n1_tex.a);
    neighbors[8] = int(n2_tex.r);
    neighbors[9] = int(n2_tex.g);
    neighbors[10] = int(n2_tex.b);
    neighbors[11] = int(n2_tex.a);
    neighbors[12] = int(n3_tex.r);
    neighbors[13] = int(n3_tex.g);
    neighbors[14] = int(n3_tex.b);
    neighbors[15] = int(n3_tex.a);

    vec2 x = vec2(x_tex.r, x_tex.g);

    for (int i = 0; i < neighbors.length(); ++i) {
        // % 64
        int ind_x = neighbors[i] & 63;
        // / 64
        int ind_y = neighbors[i] >> 6;
        vec4 n = texelFetch(agents_texture, ivec2(ind_x, ind_y), 0);
        vec2 nx = vec2(n.r, n.g);

        if (distance(x, nx) < collision_distance) {
            collision_texture = vec4(1.0, 0.0, 0.0, 0.0);
            return;
        }
    }
}
