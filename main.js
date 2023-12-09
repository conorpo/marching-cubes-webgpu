import { setupNoiseStage } from './stages/noise.js';
import { setupDebugNoiseStage } from './stages/debugNoise.js';
import { setupMarchingCubesStage } from './stages/marchingCubes.js';
import { setupRenderingStage } from './stages/rendering.js';
import { setupUI, matToString } from './util/ui.js';
import { setupCamera } from './util/camera.js';
import { setupInput } from './util/input.js';

import { mat4, vec4, vec3, quat } from 'wgpu-matrix';

const config = {
  cellCountX: 20 * 4, // must be a multiple of 4
  cellCountY: 20 * 4,
  cellCountZ: 20 * 4,  

  outputWidth: 16 * 120,
  outputHeight: 9 * 120,

  toggleDebugNoise: false,
  toggleDebugDisplay: false,
  animateIsoValue: false,
  speed: 0.015,
  mouseSensitivity: 0.0002,
};

let state = {
  frameCount: 0,
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
  
  const device = await adapter?.requestDevice({
    requiredLimits: {
      maxStorageBufferBindingSize: 1024 * 1024 * 512, // 512 MB
      maxBufferSize: 1024 * 1024 * 512, // 512 MB
    }
  });
  if (!device) return alert('Need a browser that supports WebGPU');
  
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  
  // Get a WebGPU context from the canvas and configure it
  const canvas =  document.getElementById('webgpu_canvas');
  const debugElement = document.getElementsByClassName('debug')[0];
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
  const noiseStage = setupNoiseStage(device, config);
  const debugNoiseStage = setupDebugNoiseStage(device, config, noiseStage.noiseTexture, presentationFormat);
  const marchingCubesStage = setupMarchingCubesStage(device, config, noiseStage.noiseTexture);
  const renderingStage = setupRenderingStage(device, config, presentationFormat);

  //Setup UI / Input
  setupInput(config, state, canvas)
  const camera = setupCamera(config, state, renderingStage); 
  setupUI(config, state, noiseStage, marchingCubesStage, renderingStage, camera);

  //Setup 
  const model_mat = mat4.identity();
  renderingStage.cameraSettings.set(model_mat, 0); // Offset Model by Camera Position))

  async function render(time) {   
    const deltaTime = time - state.time;
    state.time = time;

    camera.update(state.keyboard, state.mouse, deltaTime)
    state.mouse.movementX = 0;
    state.mouse.movementY = 0;
    renderingStage.updateCameraSettingsBuffer();

    const encoder = device.createCommandEncoder({label: 'Command encoder'});
    const computePass = encoder.beginComputePass({label: 'Compute Pass'});
    
    /* Noise Stage */
    computePass.setPipeline(noiseStage.pipeline);
    computePass.setBindGroup(0, noiseStage.bindGroup);
    computePass.dispatchWorkgroups(config.cellCountX / 4, config.cellCountY / 4, config.cellCountZ /4);
    
    /* Marching Cubes Stage */
    if(config.animateIsoValue === true) {
      marchingCubesStage.settings.isoValue = Math.sin(time / 400) / 40 + 0.5;  
      marchingCubesStage.updateSettingsBuffer();
    }
    computePass.setPipeline(marchingCubesStage.pipeline);
    computePass.setBindGroup(0, marchingCubesStage.bindGroup);
    computePass.dispatchWorkgroups(config.cellCountX / 4, config.cellCountY / 4, config.cellCountZ /4);

    computePass.end();

    if(config.toggleDebugNoise === true){
      debugNoiseStage.renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView(); // Update render pass view
      const renderPass = encoder.beginRenderPass(debugNoiseStage.renderPassDescriptor);

      /* Debug Noise Stage */
      device.queue.writeBuffer(debugNoiseStage.settingsBuffer, 0, new Uint32Array([Math.round(time / 50)%40]))
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
      renderPass.setVertexBuffer(0, marchingCubesStage.vertexBuffer);
      renderPass.setIndexBuffer(marchingCubesStage.indexBuffer, "uint32");
      renderPass.drawIndexedIndirect(marchingCubesStage.indirectArgsBuffer, 4);
      // renderPass.draw(9);

      renderPass.end();
    }

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);

    if(config.toggleDebugDisplay === true) {
      debugElement.innerText = `FPS: ${Math.round(1000 / deltaTime)}
      Position: x: ${camera.pos_[0].toFixed(2)} y: ${camera.pos_[1].toFixed(2)} z: ${camera.pos_[2].toFixed(2)}
      Pitch: ${camera.pitch.toFixed(2)} Yaw: ${camera.yaw.toFixed(2)}
      \nModel_Mat: ${matToString(model_mat)}
      \nView_Mat: ${matToString(camera.view_mat)} 
      \nProj_Mat: ${matToString(camera.proj_mat)}`
    }

    //Reset needed buffers for next frame
    device.queue.writeBuffer(marchingCubesStage.indirectArgsBuffer, 0, new Uint32Array([0, 0, 1, 0, 0, 0]));
    
    state.frameCount++;
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

init();
  
