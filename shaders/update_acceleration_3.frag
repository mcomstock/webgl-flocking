#version 300 es

precision highp float;
precision highp int;
precision highp usampler2D;

in vec2 cc;

uniform sampler2D position_texture, velocity_texture;
uniform usampler2D neighbor_texture_0, neighbor_texture_1;

// Don't use these
uniform float eta, lambda, center_pull, omega, cohesion, alignment, log_attraction;
// Use these
uniform float dt, abar, region_width, region_depth, region_height, predator_constant;
uniform float epsilon_par, sigma_par, epsilon_perp, sigma_perp, alpha_par, alpha_perp;
uniform int num_agents, neighbor_count;
uniform bool predator_active;
uniform vec3 predator_position;

layout (location = 0) out vec4 acceleration_texture;

int neighbors[16];
vec3 walls[6];

// The squared distance at which to start caring about walls
float sq_wall_dist_range = 5.0 * 5.0;

void main() {
    int current_agent_x = int(floor(cc.x * 64.0));
    int current_agent_y = int(floor(cc.y * 64.0));
    int current_agent_idx = 64 * current_agent_y + current_agent_x;

    if (current_agent_idx >= num_agents) {
        return;
    }

    vec3 xi = texture(position_texture, cc).xyz;
    vec3 vi = texture(velocity_texture, cc).xyz;
    vec3 vihat = normalize(vi);

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

    float apar = -4.0 * epsilon_par * 12.0 * pow(sigma_par, 12.0);
    float bpar = 4.0 * epsilon_par * alpha_par * pow(sigma_par, alpha_par);

    float aperp = -4.0 * epsilon_perp * 12.0 * pow(sigma_perp, 12.0);
    float bperp = 4.0 * epsilon_perp * alpha_perp * pow(sigma_perp, alpha_perp);

    vec3 parallel = vec3(0.0);
    vec3 perpendicular = vec3(0.0);

    // First, compute the parallel acceleration to see if the velocity direction changes
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

        vec3 xij = xi - xj;

        float rij = dot(vihat, xij);

        if (rij > 0.0) {
            rij = max(rij, 0.1);

            float rparinv = 1.0 / rij;
            float parallelmag = apar * pow(rparinv, 13.0) + bpar * pow(rparinv, alpha_par+1.0);
            parallel += parallelmag * vihat;
        }
    }

    vi += parallel * dt;
    if (vi != vec3(0.0)) {
        vihat = normalize(vi);
    }

    // Second, compute the perpendicular acceleration using the new velocity direction
    N = 0;
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

        vec3 xij = xi - xj;

        // Should this consider the angle after potentially changing direction, or before?
        if (dot(vihat, xij) > 0.0 && length(cross(xij, vihat)) > 0.0) {
            vec3 perpvec = cross(vihat, cross(xij, vihat));
            float rperpinv = 1.0 / length(perpvec);
            float perpmag = aperp * pow(rperpinv, 13.0) + bperp * pow(rperpinv, alpha_perp+1.0);
            perpendicular += perpmag * normalize(perpvec);
        }
    }

    vec3 a = perpendicular + parallel;

    if (length(a) > abar) {
        a = normalize(a) * abar;
    }

    acceleration_texture = vec4(a, 0.0);
}
