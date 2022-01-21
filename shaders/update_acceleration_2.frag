#version 300 es

precision highp float;
precision highp int;
precision highp usampler2D;

in vec2 cc;

uniform sampler2D position_texture, velocity_texture;
uniform usampler2D neighbor_texture_0, neighbor_texture_1;

// Don't use these
uniform float eta, lambda, center_pull;
// Use these
uniform float dt, abar, omega, cohesion, region_width, region_depth, region_height,
    predator_constant, log_attraction, alignment;
uniform int num_agents, neighbor_count;
uniform bool predator_active;
uniform vec3 predator_position;

layout (location = 0) out vec4 acceleration_texture;

int neighbors[16];
vec3 walls[6];

// The squared distance at which to start caring about walls
// float sq_wall_dist_range = 5.0 * 5.0;
float sq_wall_dist_range = 100000000.0;

void main() {
    int current_agent_x = int(floor(cc.x * 64.0));
    int current_agent_y = int(floor(cc.y * 64.0));
    int current_agent_idx = 64 * current_agent_y + current_agent_x;

    if (current_agent_idx >= num_agents) {
        return;
    }

    vec3 xi = texture(position_texture, cc).xyz;
    vec3 vi = texture(velocity_texture, cc).xyz;

    uvec4 n0_tex = texture(neighbor_texture_0, cc);
    uvec4 n1_tex = texture(neighbor_texture_1, cc);

    neighbors[0] = int(n0_tex.r & 65535u);
    neighbors[1] = int(n0_tex.r >> 16);
    neighbors[2] = int(n0_tex.g & 65535u);
    neighbors[3] = int(n0_tex.g >> 16);
    neighbors[4] = int(n0_tex.b & 65535u);
    neighbors[5] = int(n0_tex.b >> 16);
    neighbors[6] = int(n0_tex.a & 65535u);
    neighbors[7] = int(n0_tex.a >> 16);
    neighbors[8] = int(n1_tex.r & 65535u);
    neighbors[9] = int(n1_tex.r >> 16);
    neighbors[10] = int(n1_tex.g & 65535u);
    neighbors[11] = int(n1_tex.g >> 16);
    neighbors[12] = int(n1_tex.b & 65535u);
    neighbors[13] = int(n1_tex.b >> 16);
    neighbors[14] = int(n1_tex.a & 65535u);
    neighbors[15] = int(n1_tex.a >> 16);

    int neighbors_to_check = min(neighbor_count, neighbors.length());
    int num_walls = walls.length();

    // Nearest position on each wall
    walls[0] = vec3(0.0, xi.y, xi.z);
    walls[1] = vec3(region_width, xi.y, xi.z);
    walls[2] = vec3(xi.x, 0.0, xi.z);
    walls[3] = vec3(xi.x, region_height, xi.z);
    walls[4] = vec3(xi.x, xi.y, 0.0);
    walls[5] = vec3(xi.x, xi.y, region_depth);

    vec3 potential = vec3(0.0);
    vec3 alignment = vec3(0.0);

    int N = 0;
    for (int n = 0; n < neighbors_to_check; ++n) {
        if (neighbors[n] >= num_agents) {
            continue;
        }

        // % 64
        int ind_x = neighbors[n] & 63;
        // / 64
        int ind_y = neighbors[n] >> 6;
        ivec2 j_coords = ivec2(ind_x, ind_y);
        vec3 xj = texelFetch(position_texture, j_coords, 0).xyz;
        vec3 vj = texelFetch(velocity_texture, j_coords, 0).xyz;

        if (xi == xj) {
            continue;
        }

        ++N;

        // Vector and squared distance from neighbor to self
        vec3 xij = xj - xi;
        float sqdist = dot(xij, xij);
        float dist = sqrt(sqdist);

        float ap = 7.0, bp = 3.0, cp = 0.5, dp = 1.0, ep = 0.5;
        float farcosh = cosh(dp * (dist - ap));
        float nearcosh = cosh(ep * (dist - bp));

        // Force due to potential function
        potential -= (cp * dp * 0.5 / (farcosh*farcosh) - ep * 0.5 / (nearcosh*nearcosh)) * xij;

        // Force due to alignment
        alignment += vj - vi;
    }

    // vec3 wall = vec3(0.0);

    // for (int w = 0; w < num_walls; ++w) {
    //     vec3 w_dist = xi - walls[w];
    //     float sq_w_dist = dot(w_dist, w_dist);

    //     if (sq_w_dist < sq_wall_dist_range) {
    //         wall += normalize(w_dist) / sq_w_dist;
    //     }
    // }

    if (N == 0) {
        acceleration_texture = vec4(0.0);
        return;
    }

    vec3 a = 0.5*potential + alignment/float(N);
    // if (length(a) > abar) {
    //     a = normalize(a) * abar;
    // }

    acceleration_texture = vec4(a, 0.0);
}
