import debugNoiseShaderCode from "../shaders/debug_noise.wgsl";

export async function setupDebugNoiseStage(device, config, texture, presentationFormat) {
    const debugNoiseStage = {};

    debugNoiseStage.module = device.createShaderModule({
        label: "Debug Noise Shader",
        code: debugNoiseShaderCode,
    });

    debugNoiseStage.settingsBuffer = device.createBuffer({
        label: "Debug Noise stage settings buffer",
        size: 4,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
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
            {
                binding: 1,
                visibility: GPUShaderStage.FRAGMENT,
                buffer: {
                    type: "uniform",
                },
            }
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
            {
                binding: 1,
                resource: {
                    buffer: debugNoiseStage.settingsBuffer,
                },
            }
        ],
    });

    debugNoiseStage.pipelineLayout = device.createPipelineLayout({
        label: "Debug Noise stage pipeline layout",
        bindGroupLayouts: [debugNoiseStage.bindGroupLayout],
    });

    debugNoiseStage.renderPassDescriptor = {
        label: "Debug Noise stage render pass",
        colorAttachments: [
            {
                view: undefined, // Assigned later
                loadOp: "clear",
                storeOp: "store",
                clearColor: {r: 0, g: 0, b: 0, a: 1},
            },
        ]
    };

    debugNoiseStage.pipeline = await device.createRenderPipelineAsync({
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