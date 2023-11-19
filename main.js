import { setupNoiseStage } from './stages/noise.js';
import { setupDebugNoiseStage } from './stages/debugNoise.js';
import { setupMarchingCubesStage } from './stages/marchingCubes.js';

const config = {
  cellCountX: 25 * 4, // must be a multiple of 4
  cellCountY: 25 * 4,
  cellCountZ: 25 * 4,
};

const state = {
  frameCount: 0,
  time: 0,
};

async function init() {
  //Get a WebGPU device  
  const adapter = await navigator.gpu?.requestAdapter();
  const device = await adapter?.requestDevice();
  if (!device) { 
    alert('need a browser that supports WebGPU');
    return;
  }
  
  // Get a WebGPU context from the canvas and configure it
  const canvas =  document.getElementById('webgpu_canvas');
  const {width, height} = canvas;
  const context =  canvas.getContext('webgpu');
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  context.configure({  
    device,
    format: presentationFormat,
  });

  if(!context) {
    console.error('need a browser that supports WebGPU');
    return;
  } else{
    console.log('Context created successfully');
  }

  const noiseTextureDescriptor = {
    size: [config.cellCountX, config.cellCountY, config.cellCountZ],
    format: 'r32float',
    dimension: '3d',
    usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING
  }

  const noiseTexture = device.createTexture(noiseTextureDescriptor);

  const noiseStage = setupNoiseStage(device, config, noiseTexture);
  const debugNoiseStage = setupDebugNoiseStage(device, config, noiseTexture, presentationFormat);
  // const marchingCubesStage = setupMarchingCubesStage(device, config, noiseTexture);

  const renderPassDescriptor =  {
    label: 'fluid sim visualization render pass',
    colorAttachments: [
      {
        view: context.getCurrentTexture().createView(),
        clearValue: [0.3, 0.3, 0.3, 1],
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
  };

  function render(time) {
    
    const encoder = device.createCommandEncoder({label: 'Command encoder'});
    const pass = encoder.beginComputePass({label: 'Compute pass'});
    
    /* Noise Stage */
    pass.setPipeline(noiseStage.pipeline);
    pass.setBindGroup(0, noiseStage.bindGroup);
    pass.dispatchWorkgroups(config.cellCountX / 4, config.cellCountY / 4, config.cellCountZ /4);
    
    /* Marching Cubes Stage */
    // pass.setPipeline(marchingCubesStage.pipeline);
    // pass.setBindGroup(0, marchingCubesStage.bindGroup);
    // pass.dispatch(config.cellCountX / 4, config.cellCountY / 4, config.cellCountZ /4);

    pass.end();

    renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();
    const renderPass = encoder.beginRenderPass(renderPassDescriptor);

    /* Debug Noise Stage */
    device.queue.writeBuffer(debugNoiseStage.settingsBuffer, 0, new Uint32Array([state.frameCount % 100]))



    renderPass.setPipeline(debugNoiseStage.pipeline);
    renderPass.setBindGroup(0, debugNoiseStage.bindGroup);
    renderPass.draw(3);
    renderPass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);

    state.frameCount++;
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

  

init();
  
