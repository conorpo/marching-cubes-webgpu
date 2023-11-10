import debugNoiseShaderCode from "../shaders/debug_noise.wgsl";

export function setupDebugNoiseStage(device, config, texture, presentationFormat) {
    const debugNoiseStage = {};

    debugNoiseStage.module = device.createShaderModule({
        label: "Debug Noise Shader",
        code: debugNoiseShaderCode,
    });

    debugNoiseStage.bindGroupLayout = device.createBindGroupLayout({
        label: "Debug Noise stage bind group",
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.FRAGMENT,
                texture: {
                    sampleType: "unfilterable-float",
                    viewDimension: "3d",
                    multisampled: false,
                },
            },
        ],
    });

    debugNoiseStage.bindGroup = device.createBindGroup({
        label: "Debug Noise stage bind group",
        layout: debugNoiseStage.bindGroupLayout,
        entries: [
            {
                binding: 0,
                resource: texture.createView(),
            },
        ],
    });

    debugNoiseStage.pipelineLayout = device.createPipelineLayout({
        label: "Debug Noise stage pipeline layout",
        bindGroupLayouts: [debugNoiseStage.bindGroupLayout],
    });

    debugNoiseStage.pipeline = device.createRenderPipeline({
        label: "Debug Noise stage pipeline",
        layout: debugNoiseStage.pipelineLayout,
        vertex: {
            module: debugNoiseStage.module,
            entryPoint: "vs",
            buffers: [],
        },
        fragment: {
            module: debugNoiseStage.module,
            entryPoint: "fs",
            targets: [{format: presentationFormat}],
        }
    });

    return debugNoiseStage;
    
}