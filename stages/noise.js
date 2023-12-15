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
            },             {
                binding: 1,                 
                visibility: GPUShaderStage.COMPUTE,                 
                buffer: {
                    type: "uniform",                 
                }
            }
        ],           
    });

    noiseStage.LUTBindGroupLayout = device.createBindGroupLayout({
        label: "Compute LUT Bind group layout",
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: "read-only-storage",
                }
            },
            {
                binding: 1,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: "read-only-storage",
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

    noiseStage.pTable = device.createBuffer({
        label: "Noise stage hash table",         
        size: 512 * 4,         
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,     
    });

    device.queue.writeBuffer(noiseStage.pTable, 0, pTable);

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
                },                 {
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
        bindGroupLayouts: [noiseStage.LUTBindGroupLayout,noiseStage.bindGroupLayout],     
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

const pTable = new Uint32Array([
    32, 63, 31, 53, 204, 101, 53, 168, 232, 238, 213, 62, 158, 174, 208, 204, 183, 85, 156, 121, 72, 113, 238, 16, 192, 37, 21, 
    0, 110, 31, 17, 192, 120, 231, 179, 233, 242, 92, 188, 42, 142, 104, 199, 36, 233, 53, 98, 106, 198, 49, 60, 118, 107, 118, 
    201, 23, 34, 206, 216, 143, 0, 193, 184, 48, 2, 172, 169, 100, 124, 160, 148, 206, 163, 110, 231, 200, 60, 100, 90, 74, 0, 
    223, 6, 200, 61, 120, 114, 114, 105, 47, 96, 49, 156, 41, 119, 89, 244, 217, 198, 246, 145, 97, 108, 80, 67, 21, 238, 93, 
    161, 148, 84, 200, 86, 218, 34, 16, 53, 70, 208, 167, 21, 5, 161, 230, 69, 28, 221, 208, 35, 137, 192, 243, 229, 18, 125, 
    253, 149, 239, 43, 66, 76, 118, 90, 125, 226, 243, 129, 137, 66, 204, 84, 20, 252, 27, 72, 35, 159, 234, 176, 58, 63, 149, 
    249, 211, 162, 238, 153, 55, 195, 73, 240, 82, 83, 234, 102, 45, 195, 54, 129, 175, 149, 134, 67, 220, 114, 224, 214, 46, 2, 
    176, 132, 93, 206, 75, 194, 192, 235, 80, 157, 232, 156, 182, 190, 31, 97, 204, 108, 169, 86, 170, 197, 205, 115, 58, 170, 211, 
    55, 145, 63, 182, 201, 214, 86, 2, 81, 189, 95, 79, 42, 220, 100, 158, 175, 26, 138, 238, 148, 152, 242, 96, 141, 56, 99, 28, 193, 
    78, 7, 24, 109, 115, 126, 239, 38, 181, 27, 200, 234, 222, 52, 65, 125, 39, 165, 166, 121, 209, 128, 65, 69, 251, 170, 70, 231, 224, 
    22, 190, 242, 23, 129, 218, 116, 189, 244, 104, 114, 67, 38, 35, 18, 43, 153, 180, 173, 127, 45, 19, 240, 211, 39, 138, 207, 128, 254, 
    168, 70, 142, 168, 211, 96, 188, 211, 1, 142, 173, 136, 230, 231, 253, 171, 133, 239, 161, 220, 62, 5, 158, 202, 250, 128, 170, 106, 
    97, 10, 95, 151, 13, 241, 254, 33, 221, 148, 91, 180, 165, 132, 233, 52, 203, 40, 250, 237, 36, 86, 195, 60, 43, 4, 87, 218, 161, 
    76, 32, 198, 208, 215, 237, 77, 125, 57, 65, 23, 19, 80, 46, 200, 57, 223, 156, 49, 66, 145, 112, 253, 203, 62, 231, 31, 229, 
    153, 237, 209, 10, 59, 131, 192, 241, 227, 36, 30, 156, 252, 146, 115, 70, 66, 40, 85, 150, 114, 226, 96, 124, 134, 29, 138, 
    11, 7, 75, 75, 85, 50, 177, 95, 220, 105, 200, 229, 199, 88, 137, 197, 182, 168, 140, 118, 60, 73, 132, 108, 201, 27, 166, 
    178, 222, 98, 189, 6, 148, 198, 243, 205, 204, 51, 247, 25, 9, 111, 33, 241, 160, 145, 85, 128, 176, 64, 218, 25, 202, 82, 
    246, 219, 52, 57, 14, 181, 194, 10, 243, 4, 134, 245, 30, 191, 59, 186, 14, 112, 110, 133, 15, 213, 109, 84, 208, 97, 18, 44, 
    130, 167, 159, 237, 85, 229, 148, 83, 78, 248, 129, 85, 14, 172, 208
]);