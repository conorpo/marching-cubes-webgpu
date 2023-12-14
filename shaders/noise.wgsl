
struct Settings{
    scale: f32,
    blockiness: f32,
    eye_pos: vec3f,
}

@group(0) @binding(0) var noise_texture: texture_storage_3d<r32float, write>;
@group(0) @binding(1) var <uniform> settings : Settings;


//fade function smoothens transition between grid points
fn fade(t: f32)-> f32{
    return t * t * t * (t * (t * 6 - 15) + 10);
}

fn grad(hash: u32, coord: vec3f) -> f32 {
    var h: u32 = hash & 15u; // CONVERT LO 4 BITS OF HASH CODE
    var u: f32 = select(coord.y, coord.x, h < 8u);
    var v: f32 = select(select(coord.z, coord.x, h == 12u || h == 14u), coord.y , h < 4u);
    
    return select(u, -u, (h & 1u) != 0) + select(-v, v, (h & 2u) != 0);
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


// Constants
var<private> p: array<u32, 512> = array<u32, 512>(
    151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,
    240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,
    33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,
    158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,
    25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,
    100,109,198,173,186,3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,
    206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,
    153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,
    218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,
    107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,
    205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180,151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,
    240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,
    33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,
    158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,
    25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,
    100,109,198,173,186,3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,
    206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,
    153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,
    218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,
    107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,
    205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180
);

@compute @workgroup_size(4,4,4) fn main(
    @builtin(global_invocation_id) id: vec3<u32>
) {
    var pos = vec3f(id) + settings.eye_pos + vec3f(128.0,128.0,128.0);

    //Just rounding position for a blocky look
    let blockiness = (perlinNoise3D(pos / 20.0) * 0.5 + 0.5) * settings.blockiness;
    let grid_locked = floor(pos / 10.0) * 10.0;
    pos = mix(pos, grid_locked, blockiness);
    
    //Just messing around to create some interesting noise
    var noise_value = perlinNoise3D(pos * settings.scale) / 2.0 + 0.5;
    noise_value += perlinNoise3D(pos * settings.scale * 5.0) / 18.0;
    noise_value += (perlinNoise3D(pos * settings.scale * 10.0) / 30.0) * (perlinNoise3D(pos * settings.scale / 5.0) / 2.0 + 0.5);
    noise_value += sin(pos.x * 0.1) * 0.1;

    textureStore(noise_texture, id, vec4<f32>(noise_value , 0.0, 0.0, 1.0));
}