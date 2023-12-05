import renderingShaderCode from '../shaders/rendering.wgsl';

export function setupRenderingStage(device, config, presentationFormat) {
    const renderingStage = {};

    renderingStage.module = device.createShaderModule({
        label: "Rendering Shader",
        code: renderingShaderCode,
    });

    renderingStage.vsSettingsBuffer = device.createBuffer({
        label: "Rendering stage vertex shader settings buffer",
        size: (3 * (4 * 4) + 3 + 1) * 4, // 3 4x4 matrix of 4 byte floats, + vec3 of 4 byte floats + 4 byte padding
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

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
                    buffer: renderingStage.vsSettingsBuffer,
                },
            },
        ],
    });

    renderingStage.pipelineLayout = device.createPipelineLayout({
        label: "Rendering stage pipeline layout",
        bindGroupLayouts: [renderingStage.bindGroupLayout],
    });

    renderingStage.pipeline = device.createRenderPipeline({
        label: "Rendering stage pipeline",
        layout: renderingStage.pipelineLayout,
        vertex: {
            module: renderingStage.module,
            entryPoint: "vs",
            buffers: [
                {
                    arrayStride: 4 * 4 * 2, // position vec3 + normal + vec3 + padding
                    attributes: [
                        {
                            shaderLocation: 0,
                            offset: 0,
                            format: "float32x3",
                        },
                        {
                            shaderLocation: 1,
                            offset: 4 * 4,
                            format: "float32x3",
                        },
                    ],
                },
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
    });

    renderingStage.depthTexture = device.createTexture({
        label: "Depth texture",
        size: [config.outputWidth, config.outputHeight],
        format: "depth24plus",
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    renderingStage.depthTextureView = renderingStage.depthTexture.createView();

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
            view: renderingStage.depthTextureView, // Assigned later
            depthLoadOp: "clear",
            depthStoreOp: "store",
            depthClearValue: 1.0,
        },
    };


    //Debugging
    renderingStage.testVertexBuffer = device.createBuffer({
        label: "Test vertex buffer",
        size: 4 * 4 * 2 * 16, // 4 4-byte floats
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    renderingStage.testVertexBufferArray = new Float32Array([
        1, 0, 0, 0,
        0, 0, 0, 0,
        -1, 0, 0, 0,
        0, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 0, 0,
        0, -1, 0, 0,
        0, 0, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 0,
        0, 0, -1, 0,
        0, 0, 0, 0,
        1, 1, 0, 0,
        0, 0, 0, 0,
        1, -1, 0, 0,
        0, 0, 0, 0,
        1, 0, 1, 0,
        0, 0, 0, 0,
        1, 0, -1, 0,
        0, 0, 0, 0,
        -1, 1, 0, 0,
        0, 0, 0, 0,
        -1, -1, 0, 0,
        0, 0, 0, 0,
        -1, 0, 1, 0,
        0, 0, 0, 0,
        -1, 0, -1, 0,
        0, 0, 0, 0,
        0, 1, 1, 0,
        0, 0, 0, 0,
        0, 1, -1, 0,
        0, 0, 0, 0,
    ])

    device.queue.writeBuffer(renderingStage.testVertexBuffer, 0, renderingStage.testVertexBufferArray);

    renderingStage.testIndexBuffer = device.createBuffer({
        label: "Test index buffer",
        size: 4 * 16, // 4 4-byte floats
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });

    renderingStage.testIndexBufferArray = new Uint32Array([
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15
    ]);

    device.queue.writeBuffer(renderingStage.testIndexBuffer, 0, renderingStage.testIndexBufferArray);

    return renderingStage;

}