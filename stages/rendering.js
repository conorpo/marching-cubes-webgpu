import renderingShaderCode from '../shaders/rendering.wgsl';

export async function setupRenderingStage(device, config, presentationFormat) {
    const renderingStage = {};

    renderingStage.module = device.createShaderModule({
        label: "Rendering Shader",
        code: renderingShaderCode,
    });

    renderingStage.renderSettings = new Float32Array(4 * 4 * 3 + 4 * 2);

    renderingStage.renderSettingsBuffer = device.createBuffer({
        label: "Rendering stage vertex shader settings buffer",
        size: ((4 * 4 * 3 + 4 * 2) * 4), // 3 4x4 matrix of 4 byte floats, + vec3 of 4 byte floats + 4 byte padding + vec4 of 4 byte floats
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    renderingStage.updateRenderSettingsBuffer = () => {
        device.queue.writeBuffer(renderingStage.renderSettingsBuffer, 0, renderingStage.renderSettings);
    
    }

    renderingStage.bindGroupLayout = device.createBindGroupLayout({
        label: "Rendering stage bind group",
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                buffer: {
                    type: "uniform",
                },
            },
        ],
    });

    renderingStage.bindGroup = device.createBindGroup({
        label: "Rendering stage bind group",
        layout: renderingStage.bindGroupLayout,
        entries: [
            {
                binding: 0,
                resource: {
                    buffer: renderingStage.renderSettingsBuffer,
                },
            },
        ],
    });

    renderingStage.renderPassDescriptor = {
        colorAttachments: [
            {
                view: undefined, // Assigned later
                clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
                storeOp: "store",
                loadOp: "clear",
            },
        ],
        depthStencilAttachment: {
            view: undefined, // Assigned later
            depthLoadOp: "clear",
            depthStoreOp: "store",
            depthClearValue: 1.0,
        },
    };

    renderingStage.createDepthTexture = () => {
        renderingStage.depthTexture?.destroy();

        renderingStage.depthTexture = device.createTexture({
            label: "Depth texture",
            size: [config.outputWidth, config.outputHeight],
            format: "depth24plus",
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
        });

        renderingStage.depthTextureView = renderingStage.depthTexture.createView();

        renderingStage.renderPassDescriptor.depthStencilAttachment.view = renderingStage.depthTextureView;
    };

    renderingStage.createDepthTexture();

    renderingStage.pipelineLayout = device.createPipelineLayout({
        label: "Rendering stage pipeline layout",
        bindGroupLayouts: [renderingStage.bindGroupLayout],
    });

    renderingStage.pipeline = await device.createRenderPipelineAsync({
        label: "Rendering stage pipeline",
        layout: renderingStage.pipelineLayout,
        vertex: {
            module: renderingStage.module,
            entryPoint: "vs",
            buffers: [
                {
                    arrayStride: 4 * 3, // position vec3
                    attributes: [
                        {
                            shaderLocation: 0,
                            offset: 0,
                            format: "float32x3",
                        }
                    ],
                },
                {
                    arrayStride: 4 * 3, // normal vec3
                    attributes: [
                        {
                            shaderLocation: 1,
                            offset: 0,
                            format: "float32x3",
                        }
                    ],
                }
            ],
        },
        fragment: {
            module: renderingStage.module,
            entryPoint: "fs",
            targets: [
                {
                    format: presentationFormat,
                },
            ],
        },
        depthStencil: {
            format: "depth24plus",
            depthWriteEnabled: true,
            depthCompare: "less",
        },
        primitive: {
            topology: "triangle-list",
            cullMode: "back",
        },
    });

    return renderingStage;
}