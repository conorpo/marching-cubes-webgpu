
struct Settings{
    scale: f32,
    blockiness: f32,
    eye_pos: vec3f,
}
@group(0) @binding(0) var <storage, read> p : array<u32, 512>;

@group(1) @binding(0) var noise_texture: texture_storage_3d<r32float, write>;
@group(1) @binding(1) var <uniform> settings : Settings;


//fade function smoothens transition between grid points
fn fade(t: f32)-> f32{
    return ((t * 6 - 15) * t + 10) * t * t * t;
}

fn grad(hash: u32, coord: vec3f) -> f32 {
    let h: u32 = hash & 15u; // CONVERT LO 4 BITS OF HASH CODE
    let u: f32 = select(coord.y, coord.x, h < 8u);
    let v: f32 = select(select(coord.z, coord.x, h == 12u || h == 14u), coord.y , h < 4u);
    
    return select(u, -u, (h & 1u) == 1u) + select(-v, v, (h & 2u) == 2u);
}


fn perlinNoise3D(coord: vec3f) -> f32 {
    let floored = vec3u(floor(coord)) & vec3u(255);

    let fract = fract(coord);
    
    let u: f32 = fade(fract.x);
    let v: f32 = fade(fract.y);
    let w: f32 = fade(fract.z);


    let A: u32 = p[floored.x] + floored.y;
    let AA: u32 = p[A] + floored.z;
    let AB: u32 = p[A + 1u] + floored.z;
    let B: u32 = p[floored.x + 1u] + floored.y;
    let BA: u32 = p[B] + floored.z;
    let BB: u32 = p[B + 1u] + floored.z;

    return mix(
        mix(
            mix(
                grad(p[AA], fract),
                grad(p[BA], fract - vec3f(1.0, 0.0, 0.0)),
                u
            ),
            mix(
                grad(p[AB], fract - vec3f(0.0, 1.0, 0.0)),
                grad(p[BB], fract - vec3f(1.0, 1.0, 0.0)),
                u
            ),
            v
        ),
        mix(
            mix(
                grad(p[AA + 1], fract - vec3f(0.0, 0.0, 1.0)),
                grad(p[BA + 1], fract - vec3f(1.0, 0.0, 1.0)),
                u
            ),
            mix(
                grad(p[AB + 1], fract - vec3f(0.0, 1.0, 1.0)),
                grad(p[BB + 1], fract - vec3f(1.0, 1.0, 1.0)),
                u
            ),
            v
        ),
        w
    );
}

@compute @workgroup_size(4,4,4) fn main(
    @builtin(global_invocation_id) id: vec3<u32>
) {
    var pos = vec3f(id) + settings.eye_pos + vec3f(128.0,128.0,128.0);

    //Just rounding position for a blocky look
    let blockiness = (perlinNoise3D(pos / 20.0) * 0.5 + 0.5) * settings.blockiness;
    let grid_locked = round(pos / 8.0) * 8.0;
    pos = mix(pos, grid_locked, blockiness);
    
    //Just messing around to create some interesting noise
    var noise_value = perlinNoise3D(pos * settings.scale) / 2.0 + 0.5;
    noise_value += perlinNoise3D(pos * settings.scale * 5.0) / 18.0;
    noise_value += (perlinNoise3D(pos * settings.scale * 10.0) / 30.0) * (perlinNoise3D(pos * settings.scale / 5.0) / 2.0 + 0.5);
    noise_value += sin(pos.x * 0.1) * 0.1;

    textureStore(noise_texture, id, vec4<f32>(noise_value , 0.0, 0.0, 1.0));
}