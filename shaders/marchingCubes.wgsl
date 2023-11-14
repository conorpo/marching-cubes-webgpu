struct Settings {
    isoValue: f32
};

@group(0) @binding(0) var noise_texture: texture_3d<f32>;
@group(0) @binding(1) var<uniform> settings: Settings;

struct Vertex {
    position: vec3<f32>,
    normal: vec3<f32>
};

struct Atomics {
    vertIndex: atomic<u32>,
    indexIndex: atomic<u32>
};

@group(0) @binding(2) var<storage, read_write> atomics: Atomics;
@group(0) @binding(3) var<storage, read_write> vertices: array<Vertex>;
@group(0) @binding(4) var<storage, read_write> indices: array<u32>;

@group(0) @binding(5) var<uniform> triLUT: array<array<vec3i, 5>, 256>;
@group(0) @binding(6) var<uniform> edgeLUT: array<u32, 256>;


@compute @workgroup_size(4,4,4) fn main(
    @builtin(global_invocation_id) id: vec3<u32>
) {

    //Bottom Face clockwise, Top Face clockwise
    var isoValues: array<f32, 8>;

    isoValues[0] = textureLoad(noise_texture, id.xyz + vec3<u32>(0,0,0), 0).r;
    isoValues[1] = textureLoad(noise_texture, id.xyz + vec3<u32>(1,0,0), 0).r;
    isoValues[2] = textureLoad(noise_texture, id.xyz + vec3<u32>(1,0,1), 0).r;
    isoValues[3] = textureLoad(noise_texture, id.xyz + vec3<u32>(0,0,1), 0).r;
    isoValues[4] = textureLoad(noise_texture, id.xyz + vec3<u32>(0,1,0), 0).r;
    isoValues[5] = textureLoad(noise_texture, id.xyz + vec3<u32>(1,1,0), 0).r;
    isoValues[6] = textureLoad(noise_texture, id.xyz + vec3<u32>(1,1,1), 0).r;
    isoValues[7] = textureLoad(noise_texture, id.xyz + vec3<u32>(0,1,1), 0).r;

    var cubeIndex: u32 = 0;
    if (isoValues[0] < settings.isoValue) { cubeIndex |= 1; }
    if (isoValues[1] < settings.isoValue) { cubeIndex |= 2; }
    if (isoValues[2] < settings.isoValue) { cubeIndex |= 4; }
    if (isoValues[3] < settings.isoValue) { cubeIndex |= 8; }
    if (isoValues[4] < settings.isoValue) { cubeIndex |= 16; }
    if (isoValues[5] < settings.isoValue) { cubeIndex |= 32; }
    if (isoValues[6] < settings.isoValue) { cubeIndex |= 64; }
    if (isoValues[7] < settings.isoValue) { cubeIndex |= 128; }

    // TODO
}