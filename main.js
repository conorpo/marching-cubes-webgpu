import { setupNoiseStage } from './stages/noise.js';
import { setupDebugNoiseStage } from './stages/debugNoise.js';
import { setupMarchingCubesStage } from './stages/marchingcubes.js';
import { setupRenderingStage } from './stages/rendering.js';
import { setupUI } from './util/ui.js';
import { setupCamera } from './util/camera.js';
import { setupInput } from './util/input.js';
import Stats from 'stats.js';

import { mat4, vec4, vec3, quat } from 'wgpu-matrix';

const config = {
  cellCountX: 24 * 4, // must be a multiple of 4
  cellCountY: 24 * 4,
  cellCountZ: 24 * 4,  

  outputWidth: 16 * 120,
  outputHeight: 9 * 120,

  toggleDebugNoise: false,
  animateIsoValue: false,
  speed: 0.015,
  mouseSensitivity: 0.0002,

  timestamp_queries: true,

  ambient_factor: 0.35,
  diffuse_factor: 0.9,
  specular_factor: 0.4,
  shininess: 32.0,
};

let state = {
  time: 0,

  keyboard: {
    w: false,
    a: false,
    s: false,
    d: false,
    ' ': false,
    Control: false,
  },

  mouse: {
    movementX: 0,
    movementY: 0,
  }
};

async function init() {
  //Get a WebGPU device 
  const adapter = await navigator.gpu?.requestAdapter();
  
  let device;
  await adapter?.requestDevice({
    requiredLimits: {
      maxStorageBufferBindingSize: 1024 * 1024 * 512, // 512 MB
      maxBufferSize: 1024 * 1024 * 512, // 512 MB
    },
    requiredFeatures: ['timestamp-query'],
  }).catch(e => {
    config.timestamp_queries = false;
    return adapter.requestDevice({ // fallback to only buffer limits
      requiredLimits: {
        maxStorageBufferBindingSize: 1024 * 1024 * 512, // 512 MB
        maxBufferSize: 1024 * 1024 * 512, // 512 MB
      },
    }); 
  }).catch(e => {
    return adapter.requestDevice(); // fallback to no limits
  }).then(d => {
    console.log(config.timestamp_queries ? 'Using timestamp queries' : 'Not using timestamp queries')
    device = d;
  }).catch(e => {
    console.error(e);
    return alert('Need a browser that supports WebGPU')
  });
  config.maxBufferSize = device.limits.maxStorageBufferBindingSize;
  
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  
  // Get a WebGPU context from the canvas and configure it
  const canvas =  document.getElementById('webgpu_canvas');
  canvas.width = config.outputWidth;
  canvas.height = config.outputHeight;
  const context = canvas.getContext('webgpu');
  
  if(!context) return alert('Need a browser that supports WebGPU');
  console.log('Context created successfully');

  context.configure({  
    device,
    format: presentationFormat,
  });

  //Setup Stages
  const noiseStage = await setupNoiseStage(device, config);
  const debugNoiseStage = await setupDebugNoiseStage(device, config, noiseStage.noiseTexture, presentationFormat);
  const marchingCubesStage = await setupMarchingCubesStage(device, config, noiseStage);
  const renderingStage = await setupRenderingStage(device, config, presentationFormat, noiseStage);

  //Setup UI / Input
  setupInput(config, state, canvas)
  const camera = setupCamera(config, state, renderingStage, noiseStage); 
  setupUI(config, state, noiseStage, marchingCubesStage, renderingStage, camera, debugNoiseStage);

  //Setup Debug Timings
  const debugTimings = {};
  if(config.timestamp_queries) {
    debugTimings.querySet = device.createQuerySet({
      type: 'timestamp',
      count: 4, //Initial, After Noise, After Marching Cubes, After Rendering
    });
  
    debugTimings.timestampBuffer = device.createBuffer({
      size: 4 * 8,
      usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.QUERY_RESOLVE,
    });
  
    debugTimings.timestampReadBuffer = device.createBuffer({
      size: 4 * 8,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });  
  };

  
  //Performance Monitor Library stats.js
  const stats = new Stats();
  if(config.timestamp_queries) {
    stats.noisePass = stats.addPanel(new Stats.Panel('µs Noise', '#ff0', '#200'));
    stats.marchingCubesPass = stats.addPanel(new Stats.Panel('µs Marching', '#f0f', '#202'));
    stats.renderPass = stats.addPanel(new Stats.Panel('µs Render', '#0f0', '#020'));
  }
  document.body.appendChild(stats.dom);

  //Setup 
let x = 0;
  function resizeIfNeeded() {
    const width = Math.max(1, Math.min(device.limits.maxTextureDimension2D, canvas.clientWidth));
    const height = Math.max(1, Math.min(device.limits.maxTextureDimension2D, canvas.clientHeight));

    if (canvas.width === width && canvas.height === height) return;
    config.outputWidth = canvas.width = width;
    config.outputHeight = canvas.height = height;

    console.log(`Resized canvas to ${width}x${height}`);
    
    renderingStage.createDepthTexture();
  }

  async function render(time) {   
    const deltaTime = time - state.time;
    state.time = time;

    stats.begin();

    resizeIfNeeded();

    //Update Camera
    camera.update(state.keyboard, state.mouse, deltaTime)
    noiseStage.updateSettingsBuffer();
    renderingStage.updateRenderSettingsBuffer();

    const encoder = device.createCommandEncoder({label: 'Command encoder'});

    if(config.timestamp_queries) {
      encoder.writeTimestamp(debugTimings.querySet, 0);
    }

    let computePass = encoder.beginComputePass({label: 'Compute Pass'});

    /* Noise Stage */
    computePass.setPipeline(noiseStage.pipeline);
    computePass.setBindGroup(0, marchingCubesStage.LUTBindGroup);
    computePass.setBindGroup(1, noiseStage.bindGroup);
    computePass.dispatchWorkgroups(config.cellCountX / 4, config.cellCountY / 4, config.cellCountZ / 4);
    
    if(config.timestamp_queries) {
      computePass.end();
      encoder.writeTimestamp(debugTimings.querySet, 1);
      computePass = encoder.beginComputePass({label: 'Compute Pass'});
    }
    
    /* Marching Cubes Stage */
    if(config.animateIsoValue === true) {
      marchingCubesStage.settings.isoValue = Math.sin(time / 400) / 40 + 0.5;  
      marchingCubesStage.updateSettingsBuffer();
    }
    computePass.setPipeline(marchingCubesStage.pipeline);
    if(config.timestamp_queries) computePass.setBindGroup(0, marchingCubesStage.LUTBindGroup);
    computePass.setBindGroup(1, marchingCubesStage.bindGroup);
    computePass.dispatchWorkgroups(config.cellCountX / 4, config.cellCountY / 4, config.cellCountZ /4);

    computePass.end();

    if(config.timestamp_queries) {
      encoder.writeTimestamp(debugTimings.querySet, 2);
    }

    if(config.toggleDebugNoise === true){
      /* Debug Noise Stage */
      debugNoiseStage.renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView(); // Update render pass view

      const renderPass = encoder.beginRenderPass(debugNoiseStage.renderPassDescriptor);
      renderPass.setPipeline(debugNoiseStage.pipeline);
      renderPass.setBindGroup(0, debugNoiseStage.bindGroup);
      renderPass.draw(3);

      renderPass.end();
    }else{
      /* Rendering Stage */
      renderingStage.renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView(); // Update render pass view

      const renderPass = encoder.beginRenderPass(renderingStage.renderPassDescriptor);

      renderPass.setPipeline(renderingStage.pipeline);
      renderPass.setBindGroup(0, renderingStage.bindGroup);
      renderPass.setVertexBuffer(0, marchingCubesStage.positionBuffer);
      renderPass.setVertexBuffer(1, marchingCubesStage.normalBuffer);
      renderPass.setIndexBuffer(marchingCubesStage.indexBuffer, "uint32");
      renderPass.drawIndexedIndirect(marchingCubesStage.indirectArgsBuffer, 4);

      renderPass.end();
    }

    if(config.timestamp_queries) {
      encoder.writeTimestamp(debugTimings.querySet, 3);
      encoder.resolveQuerySet(debugTimings.querySet, 0, 4, debugTimings.timestampBuffer, 0);
      encoder.copyBufferToBuffer(debugTimings.timestampBuffer, 0, debugTimings.timestampReadBuffer, 0, 4 * 8);
    }

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);

    if(config.timestamp_queries) {
      await debugTimings.timestampReadBuffer.mapAsync(GPUMapMode.READ);
      const timestamps = new BigUint64Array(debugTimings.timestampReadBuffer.getMappedRange()).slice();
      debugTimings.timestampReadBuffer.unmap();

      stats.noisePass.update(Number(timestamps[1] - timestamps[0]) / 1000, 1000);
      stats.marchingCubesPass.update(Number(timestamps[2] - timestamps[1]) / 1000, 1000);
      stats.renderPass.update(Number(timestamps[3] - timestamps[2]) / 1000, 1000);
    }

    //Reset needed buffers for next frame
    device.queue.writeBuffer(marchingCubesStage.indirectArgsBuffer, 0, new Uint32Array([0, 0, 1, 0, 0, 0]));
    debugNoiseStage.updateSettingsBuffer(Math.round(time / 50));
    state.mouse.movementX = 0;
    state.mouse.movementY = 0;
    
    stats.end();
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

init();
  
