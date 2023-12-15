// struct FSInput {
//     colorMult: vec4f,
//     specularFactor: f32,
// };
struct Vertex {
    @builtin(vertex_index) index: u32,
    @location(0) position: vec3<f32>,
    @location(1) normal: vec3<f32>
};

struct RenderSettings {
    modelMatrix: mat4x4f,
    viewMatrix: mat4x4f,
    projectionMatrix: mat4x4f,
    eye_pos: vec3<f32>,
    material: vec4<f32>, // ambient, diffuse, specular, shininess
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

@group(0) @binding(0) var<uniform> renderSettings: RenderSettings;

@vertex fn vs(vert: Vertex) -> VSOutput {
    let worldPos = renderSettings.modelMatrix * vec4f(vert.position, 1.0);
    //let worldPos = vec4f(vert.position + floor(renderSettings.eye_pos), 1.0);

    var vsOut: VSOutput;
    vsOut.fragPos = worldPos.xyz;
    vsOut.position = renderSettings.projectionMatrix * renderSettings.viewMatrix * worldPos;
    vsOut.color = vec3f(sin(worldPos.z/15) / 2 + 0.5 , sin(worldPos.y/30) / 2 + 0.5, sin(worldPos.x/15) / 2 + 0.5);
    vsOut.normal = vert.normal;

    return vsOut;
}

@fragment fn fs(fsInput: VSOutput) -> @location(0) vec4f {
    let normal = normalize(fsInput.normal);
    let eyeDir = normalize(renderSettings.eye_pos - fsInput.fragPos);

    let intensity = clamp(dot(eyeDir, normal) , 0.0, 1.0);

    let reflectionDir = reflect(-eyeDir, normal);
    let specular = pow(clamp(dot(reflectionDir, eyeDir), 0.0, 1.0), renderSettings.material.w);

    var outputColor = (renderSettings.material.x + renderSettings.material.y * intensity + renderSettings.material.z * specular) * fsInput.color;
    outputColor *= clamp((1-distance(fsInput.fragPos, renderSettings.eye_pos) / 50.0), 0.0, 1.0);

    return vec4f(outputColor, 1.0);
}
