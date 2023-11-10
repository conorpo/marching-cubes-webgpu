@group(0) @binding(0) var noise_texture : texture_3d<f32>;

const pos = array<vec2f, 3>(
    vec2f(-1, -1), vec2f(-1, 3), vec2f(3, -1)
);

@vertex fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
    let p = pos[i];
    return vec4f(p, 0, 1);
}

@fragment fn fs(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let coords = vec2u(pos.xy);

    var red : f32 = 0.0;
    var green: f32 = 0.0;
    var blue: f32 = 0.0;

    let depth = textureDimensions(noise_texture).z;

    for (var i : u32 = 0; i < 33; i++) {
        red += textureLoad(noise_texture, vec3u(coords, i), 0).r;
    }

    red /= 33.0;

    for (var i : u32 = 33; i < 66; i++) {
        green += textureLoad(noise_texture, vec3u(coords, i), 0).r;
    }

    green /= 33.0;

    for (var i : u32 = 66; i < 100; i++) {
        blue += textureLoad(noise_texture, vec3u(coords, i), 0).r;
    }

    blue /= 33.0;

    return vec4f(red, green, blue, 1);
}