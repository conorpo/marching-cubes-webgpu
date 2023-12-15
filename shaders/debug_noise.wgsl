@group(0) @binding(0) var noise_texture : texture_3d<f32>;
@group(0) @binding(1) var<uniform> settings: Settings;

struct Settings {
    cellCount: vec2f,
    outputSize: vec2f,
    zIndex: u32,
    cellCountZ: u32,
}

const pos = array<vec2f, 3>(
    vec2f(-1, -1), vec2f(-1, 3), vec2f(3, -1)
);

@vertex fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
    let p = pos[i];
    return vec4f(p, 0, 1);
}

@fragment fn fs(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let textureCoord = vec2u(pos.xy * settings.cellCount / settings.outputSize);
    
    let red = textureLoad(noise_texture, vec3u(textureCoord, settings.zIndex % settings.cellCountZ), 0).r;
    let green = textureLoad(noise_texture, vec3u(textureCoord, (settings.zIndex + 1) % settings.cellCountZ), 0).r;
    let blue = textureLoad(noise_texture, vec3u(textureCoord, (settings.zIndex + 2) % settings.cellCountZ), 0).r;
    
    return vec4f(red, green, blue, 1);
}