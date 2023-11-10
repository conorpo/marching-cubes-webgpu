import noiseShaderCode from '../shaders/noise.wgsl?raw';

export function setupNoiseStage(device, config, noiseTexture) {
    const noiseStage = {};
    noiseStage.module = device.createShaderModule({
        label: "Noise Shader",
        code: noiseShaderCode,
    });
    
    noiseStage.bindGroupLayout = device.createBindGroupLayout({
        label: "Noise stage bind group",
        entries: [
            {
            binding: 0,
            visibility: GPUShaderStage.COMPUTE,
            storageTexture: {
                access: "write-only",
                format: 'r32float',
                viewDimension: '3d',
            },
            }
        ]
    });
    
    noiseStage.bindGroup = device.createBindGroup({
        label: "Noise stage bind group",
        layout: noiseStage.bindGroupLayout,
        entries: [
            {
                binding: 0,
                resource: noiseTexture.createView(),
            }
        ]
    });
    
    noiseStage.pipelineLayout = device.createPipelineLayout({
        label: "Noise stage pipeline layout",
        bindGroupLayouts: [noiseStage.bindGroupLayout],
    });

    noiseStage.pipeline = device.createComputePipeline({
        label: "Noise stage pipeline",
        layout: noiseStage.pipelineLayout,
        compute: {
            module: noiseStage.module,
            entryPoint: "main",
        },
    }); 

    return noiseStage;
}