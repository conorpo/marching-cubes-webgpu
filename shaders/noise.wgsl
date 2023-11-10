@group(0) @binding(0) var noise_texture: texture_storage_3d<r32float, write>;

fn randomGradient(id: vec3f) -> vec3f {
    return vec3f(0.0, 0.0, 0.0);
}

@compute @workgroup_size(4,4,4) fn main(
    @builtin(global_invocation_id) id: vec3<u32>
) {
    var value = -f32(id.y) + 50.0;
    value += sin(f32(id.x + id.z / 2) / 10.0) * 10.0;
    
    value = clamp(value, 0.0, 1.0);

    textureStore(noise_texture, id, vec4<f32>(value, 0.0, 0.0, 1.0));
}