import noiseShaderCode from '../shaders/noise.wgsl?raw';

export async function setupNoiseStage(device, config) {
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
            },
            {
                binding: 1,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: "uniform",
                }
            }
        ]
    });

    noiseStage.settingsBuffer = device.createBuffer({
        label: "Noise Settings",
        size: 32,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    noiseStage.settings = {
        scale: 0.05,
        blockiness: 0.25,
    }

    noiseStage.localSettingsBuffer = new Float32Array([noiseStage.settings.scale,noiseStage.settings.blockiness,0,0,0,0,0,0]);

    noiseStage.updateSettingsBuffer = () => {
        device.queue.writeBuffer(noiseStage.settingsBuffer, 0, noiseStage.localSettingsBuffer);
    }

    noiseStage.updateSettingsBuffer(); // Initial update

    noiseStage.createNoiseTexture = () => {
        noiseStage.noiseTexture?.destroy();

        noiseStage.noiseTexture = device.createTexture({
            size: [config.cellCountX, config.cellCountY, config.cellCountZ],
            format: 'r32float',
            dimension: '3d',
            usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING
        });

        //Also replace the bind group
        noiseStage.bindGroup = device.createBindGroup({
            label: "Noise stage bind group",
            layout: noiseStage.bindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: noiseStage.noiseTexture.createView(),
                },
                {
                    binding: 1,
                    resource:{
                        buffer: noiseStage.settingsBuffer,
                    }
                }
            ]
        });
    };
    noiseStage.createNoiseTexture();
    
    noiseStage.pipelineLayout = device.createPipelineLayout({
        label: "Noise stage pipeline layout",
        bindGroupLayouts: [noiseStage.bindGroupLayout],
    });

    noiseStage.pipeline = await device.createComputePipelineAsync({
        label: "Noise stage pipeline",
        layout: noiseStage.pipelineLayout,
        compute: {
            module: noiseStage.module,
            entryPoint: "main",
        },
    }); 

    return noiseStage;
}