struct Settings {
    isoValue: f32
};

struct Vertex {
    position: vec3<f32>,
    normal: vec3<f32>
};

struct Atomics {
    vertIndex: atomic<u32>,
    indexIndex: atomic<u32>
};

struct ConfigurationEntry {
  triCount: u32,
  edgeCount: u32,
  edges: u32,
  tris: array<vec3i,5>
}


@group(0) @binding(0) var noise_texture: texture_3d<f32>;
@group(0) @binding(1) var<uniform> settings: Settings;
@group(0) @binding(2) var<storage, read_write> atomics: Atomics;
@group(0) @binding(3) var<storage, read_write> vertices: array<Vertex>;
@group(0) @binding(4) var<storage, read_write> indices: array<u32>;
@group(0) @binding(5) var<uniform> LUT: array<ConfigurationEntry, 256>;

// Maps the edge indeces to the new indeces in the vertex buffer
var<private> indexMap: array<u32, 12>;
var<private> currentIdx: u32 = 0;
var<private> edgeInterpLUT: array<vec3u, 12> = array<vec3u, 12>( // V1, V2, Axis
    vec3(0, 1, 2),
    vec3(2, 1, 0),
    vec3(3, 2, 2),
    vec3(3, 0, 0),
    vec3(4, 5, 2),
    vec3(6, 5, 0),
    vec3(7, 6, 2),
    vec3(7, 4, 0),
    vec3(0, 4, 1),
    vec3(1, 5, 1),
    vec3(2, 6, 1),
    vec3(3, 7, 1)
);

@compute @workgroup_size(4,4,4) fn main(
    @builtin(global_invocation_id) id: vec3<u32>
) {

    //Bottom Face clockwise, Top Face clockwise
    var isoValues: array<f32, 8>;

    isoValues[0] = textureLoad(noise_texture, id.xyz + vec3<u32>(0,0,1), 0).r;
    isoValues[1] = textureLoad(noise_texture, id.xyz + vec3<u32>(1,0,1), 0).r;
    isoValues[2] = textureLoad(noise_texture, id.xyz + vec3<u32>(1,0,0), 0).r;
    isoValues[3] = textureLoad(noise_texture, id.xyz + vec3<u32>(0,0,0), 0).r;
    isoValues[4] = textureLoad(noise_texture, id.xyz + vec3<u32>(0,1,1), 0).r;
    isoValues[5] = textureLoad(noise_texture, id.xyz + vec3<u32>(1,1,1), 0).r;
    isoValues[6] = textureLoad(noise_texture, id.xyz + vec3<u32>(1,1,0), 0).r;
    isoValues[7] = textureLoad(noise_texture, id.xyz + vec3<u32>(0,1,0), 0).r;

    var cubeIndex: u32 = 0;
    if (isoValues[0] < settings.isoValue) { cubeIndex |= 1; }
    if (isoValues[1] < settings.isoValue) { cubeIndex |= 2; }
    if (isoValues[2] < settings.isoValue) { cubeIndex |= 4; }
    if (isoValues[3] < settings.isoValue) { cubeIndex |= 8; }
    if (isoValues[4] < settings.isoValue) { cubeIndex |= 16; }
    if (isoValues[5] < settings.isoValue) { cubeIndex |= 32; }
    if (isoValues[6] < settings.isoValue) { cubeIndex |= 64; }
    if (isoValues[7] < settings.isoValue) { cubeIndex |= 128; }

    let config = LUT[cubeIndex];

    // Handles the case where the cube is entirely inside or outside of the surface
    if (config.triCount == 0) {
        return;
    }

    var startingVertIndex: u32 = atomicAdd(&atomics.vertIndex, config.edgeCount);
    var startingIndexIndex: u32 = atomicAdd(&atomics.indexIndex, config.triCount * 3);


    let global_pos = vec3f(id.xyz);
    var edgeMask = 1;
    // Generate the vertices
    for(var i = 0; i < 12; i++) {
        let f0 = isoValues[edgeInterpLUT[i].x];
        let f1 = isoValues[edgeInterpLUT[i].y];
        let axis = edgeInterpLUT[i].z;

        let interpolated = (settings.isoValue - f0) / (f1 - f0);
        var local_pos: vec3f = vec3f(id.xyz);
        local_pos[axis] += interpolated;
        
        indexMap[i] = startingVertIndex + currentIdx;
        vertices[indexMap[i]].position = local_pos;       
        currentIdx += 1;

        edgeMask <<= 1;
    }

    // Generate the indices
    for(var i = 0u; i < config.triCount; i++) {
        let tri = config.tris[i];
        indices[startingIndexIndex + i * 3 + 0] = indexMap[tri.x];
        indices[startingIndexIndex + i * 3 + 1] = indexMap[tri.y];
        indices[startingIndexIndex + i * 3 + 2] = indexMap[tri.z];
    }

    //Done?
}