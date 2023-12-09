// struct FSInput {
//     colorMult: vec4f,
//     specularFactor: f32,
// };
struct Vertex {
    @builtin(vertex_index) index: u32,
    @location(0) position: vec3<f32>,
    @location(1) normal: vec3<f32>
};

struct VSInput {
    modelMatrix: mat4x4f,
    viewMatrix: mat4x4f,
    projectionMatrix: mat4x4f,
    eye_pos: vec3<f32>,
};

struct VSOutput {
    @builtin(position) position: vec4f,
    @location(0) color: vec3f,
    @location(1) normal: vec3f,
    @location(2) fragPos: vec3f,
};

const positions = array<vec3<f32>, 9>(
    vec3<f32>(-1.0, 1.0,  -1.0),
    vec3<f32>(1.0, 1.0,  -1.0),
    vec3<f32>(-1.0,  -1.0,  -1.0),
    vec3<f32>(-1.0,  1.0,  -1.0),
    vec3<f32>(1.0, 1.0, -1.0),
    vec3<f32>(-1.0, 1.0, 1.0),
    vec3<f32>(-1.0,  1.0, -1.0),
    vec3<f32>(-1.0,  1.0, 1.0),
    vec3<f32>(-1.0,  -1.0, -1.0),
);

@group(0) @binding(0) var<uniform> vsInput: VSInput;
// @group(0) @binding(1) var<uniform> fsUni: FSInput;

@vertex fn vs(vert: Vertex) -> VSOutput {
    let worldPos = vsInput.modelMatrix * vec4f(vert.position, 1.0);

    var vsOut: VSOutput;
    vsOut.fragPos = worldPos.xyz;
    vsOut.position = vsInput.projectionMatrix * vsInput.viewMatrix * worldPos;
    vsOut.color = vec3f(0.4, 1.0-(worldPos.y/30.0), 0.8);
    vsOut.color *= clamp((1- vsOut.position.z / 2500.0) , 0.0, 1.0);
    vsOut.normal = vert.normal;

    return vsOut;
}

@fragment fn fs(fsInput: VSOutput) -> @location(0) vec4f {
    var color = fsInput.color;

    let normal = normalize(fsInput.normal);
    let eyeDir = normalize(fsInput.fragPos - vsInput.eye_pos);

    let intensity = clamp(dot(eyeDir, normal), 0.0, 1.0);
    color *= intensity;    

    return vec4f(color, 1.0);
}
