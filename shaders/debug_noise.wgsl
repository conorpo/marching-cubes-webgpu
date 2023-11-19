@group(0) @binding(0) var noise_texture : texture_3d<f32>;
@group(0) @binding(1) var<uniform> settings: Settings;

struct Settings {
    zIndex: u32
}

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

    
    red += textureLoad(noise_texture, vec3u(coords, settings.zIndex), 0).r;
    green += textureLoad(noise_texture, vec3u(coords, settings.zIndex + 1), 0).r;
    blue += textureLoad(noise_texture, vec3u(coords, settings.zIndex + 2), 0).r;
    
    return vec4f(red, green, blue, 1);
}