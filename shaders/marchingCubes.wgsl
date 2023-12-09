struct Settings {
    isoValue: f32,
    interpolationFactor: f32,
};


struct Vertex {
    position: vec3<f32>,
    normal: vec3<f32>
};

struct IndirectArgs {
    vertIndex: atomic<u32>,
    indexCount: atomic<u32>,
    instanceCount: u32,
    firstIndex: u32,
    baseVertex: u32,
    firstInstance: u32
};

struct ConfigurationEntry {
  triCount: u32,
  edgeCount: u32,
  edges: u32,
  tris: array<vec3i,5>
};


struct EdgeLUTEntry {
    v1: u32,
    v2: u32,
    staticOffset: vec3f,
    interpolatedOffset: vec3f
}

@group(0) @binding(0) var noise_texture: texture_3d<f32>;
@group(0) @binding(1) var<uniform> settings: Settings;
@group(0) @binding(2) var<storage, read_write> indirectArgs : IndirectArgs;
@group(0) @binding(3) var<storage, read_write> vertices: array<Vertex>;
@group(0) @binding(4) var<storage, read_write> indices: array<u32>;
@group(0) @binding(5) var<uniform> LUT: array<ConfigurationEntry, 256>;
// Add a binding for cube id

// Maps the edge indeces to the new indeces in the vertex buffer
var<private> indexMap: array<u32, 12>;
var<private> currentIdx: u32 = 0;
const edgeLUT = array<EdgeLUTEntry,12>(
    EdgeLUTEntry(0,1, vec3f(0.0, 0.0, 0.0), vec3f(1.0, 0.0, 0.0)),
    EdgeLUTEntry(1,2, vec3f(1.0, 0.0, 0.0), vec3f(0.0, 0.0, 1.0)),
    EdgeLUTEntry(3,2, vec3f(0.0, 0.0, 1.0), vec3f(1.0, 0.0, 0.0)),
    EdgeLUTEntry(0,3, vec3f(0.0, 0.0, 0.0), vec3f(0.0, 0.0, 1.0)),
    EdgeLUTEntry(4,5, vec3f(0.0, 1.0, 0.0), vec3f(1.0, 0.0, 0.0)),
    EdgeLUTEntry(5,6, vec3f(1.0, 1.0, 0.0), vec3f(0.0, 0.0, 1.0)),
    EdgeLUTEntry(7,6, vec3f(0.0, 1.0, 1.0), vec3f(1.0, 0.0, 0.0)),
    EdgeLUTEntry(4,7, vec3f(0.0, 1.0, 0.0), vec3f(0.0, 0.0, 1.0)),
    EdgeLUTEntry(0,4, vec3f(0.0, 0.0, 0.0), vec3f(0.0, 1.0, 0.0)),
    EdgeLUTEntry(1,5, vec3f(1.0, 0.0, 0.0), vec3f(0.0, 1.0, 0.0)),
    EdgeLUTEntry(2,6, vec3f(1.0, 0.0, 1.0), vec3f(0.0, 1.0, 0.0)),
    EdgeLUTEntry(3,7, vec3f(0.0, 0.0, 1.0), vec3f(0.0, 1.0, 0.0)),
);

fn valueAt(pos: vec3<u32>) -> f32 {
    return textureLoad(noise_texture, pos, 0).r;
}

// Maybe approximate AO here somehow?
fn normalAt(pos: vec3<u32>) -> vec3<f32> {
    return vec3(
        valueAt(pos - vec3<u32>(1,0,0)) - valueAt(pos + vec3<u32>(1,0,0)),
        valueAt(pos - vec3<u32>(0,1,0)) - valueAt(pos + vec3<u32>(0,1,0)),
        valueAt(pos - vec3<u32>(0,0,1)) - valueAt(pos + vec3<u32>(0,0,1))
    );
}

@compute @workgroup_size(4,4,4) fn main(
    @builtin(global_invocation_id) id: vec3<u32>,
    @builtin(local_invocation_index) index: u32
) {
    //Bottom Face clockwise, Top Face clockwise
    var isoValues: array<f32, 8>;

    isoValues[0] = valueAt(id.xyz + vec3<u32>(0,0,0));
    isoValues[1] = valueAt(id.xyz + vec3<u32>(1,0,0));
    isoValues[2] = valueAt(id.xyz + vec3<u32>(1,0,1));
    isoValues[3] = valueAt(id.xyz + vec3<u32>(0,0,1));
    isoValues[4] = valueAt(id.xyz + vec3<u32>(0,1,0));
    isoValues[5] = valueAt(id.xyz + vec3<u32>(1,1,0));
    isoValues[6] = valueAt(id.xyz + vec3<u32>(1,1,1));
    isoValues[7] = valueAt(id.xyz + vec3<u32>(0,1,1));



    var cubeIndex: u32 = 0;
    if (isoValues[0] > settings.isoValue) { cubeIndex |= 1; }
    if (isoValues[1] > settings.isoValue) { cubeIndex |= 2; }
    if (isoValues[2] > settings.isoValue) { cubeIndex |= 4; }
    if (isoValues[3] > settings.isoValue) { cubeIndex |= 8; }
    if (isoValues[4] > settings.isoValue) { cubeIndex |= 16; }
    if (isoValues[5] > settings.isoValue) { cubeIndex |= 32; }
    if (isoValues[6] > settings.isoValue) { cubeIndex |= 64; }
    if (isoValues[7] > settings.isoValue) { cubeIndex |= 128; }

    let config = LUT[cubeIndex];

    // Handles the case where the cube is entirely inside or outside of the surface
    if (config.triCount == 0) {
        // atomicAdd(&indirectArgs.indexCount, 1);
        // vertices[index].position = vec3<f32>(f32(index), f32(index%2), f32(index%3));
        // indices[index] = index;
        return;
    }

    var startingVertIndex: u32 = atomicAdd(&indirectArgs.vertIndex, config.edgeCount);
    var startingIndexIndex: u32 = atomicAdd(&indirectArgs.indexCount, config.triCount * 3);


    let global_pos = vec3f(id.xyz);
    var edgeMask:u32 = 1;
    // Generate the vertices
    for(var i = 0; i < 12; i++) {
        if ((config.edges & edgeMask) == 0) {
            edgeMask <<= 1;
            continue;
        }

        let edgeLUTEntry = edgeLUT[i];

        let f1 = isoValues[edgeLUTEntry.v1];
        let f2 = isoValues[edgeLUTEntry.v2];
        let t = mix(0.5, (settings.isoValue - f1) / (f2 - f1), settings.interpolationFactor);

        let vert_pos: vec3f = vec3f(id.xyz) + edgeLUTEntry.staticOffset + edgeLUTEntry.interpolatedOffset * t;
        
        indexMap[i] = startingVertIndex + currentIdx;
        vertices[indexMap[i]].position = vert_pos; 
        let na = normalAt(id.xyz + vec3u(edgeLUTEntry.staticOffset));
        let nb = normalAt(id.xyz + vec3u(edgeLUTEntry.staticOffset + edgeLUTEntry.interpolatedOffset));
        vertices[indexMap[i]].normal = mix(na, nb, t);

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