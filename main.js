import { setupNoiseStage } from './stages/noise.js';
import { setupDebugNoiseStage } from './stages/debugNoise.js';
import { setupMarchingCubesStage } from './stages/marchingCubes.js';
import { setupRenderingStage } from './stages/rendering.js';
import { setupUI, matToString } from './util/ui.js';
import { setupInput } from './util/input.js';
import { mat4, vec4, vec3, quat } from 'gl-matrix';

const config = {
  cellCountX: 10 * 4, // must be a multiple of 4
  cellCountY: 10 * 4,
  cellCountZ: 10 * 4,  

  outputWidth: 16 * 60,
  outputHeight: 9 * 60,

  toggleDebugNoise: false,
  toggleDebugDisplay: false,
  animateIsoValue: false,
  speed: 0.05,
};

const state = {
  frameCount: 0,
  prevTime: 0,

  camera: {
    fov: 45,
    pos: null, /* Initialized in init() */
    rotation: null,
    model_mat: null,
    view_mat: null,
    proj_mat: null,
  },

  keyboard: {
    w: false,
    a: false,
    s: false,
    d: false,
    ' ': false,
    Control: false,
  }
};

const localBuffers = {
  vsSettings: new Float32Array((3 * (4 * 4) + 3 + 1) ),
}

async function init() {
  //Get a WebGPU device 
  state.camera.pos = vec3.fromValues(10, 15, 50);
  state.camera.rotation = quat.fromValues(0, 0, 0, 1);

  state.camera.model_mat = mat4.create();
  state.camera.view_mat = mat4.create();
  state.camera.proj_mat = mat4.create();

  localBuffers.vsSettings.set(state.camera.model_mat, 0);
  localBuffers.vsSettings.set(state.camera.view_mat, 4 * 4);
  localBuffers.vsSettings.set(state.camera.proj_mat, 4 * 4 * 2);
  localBuffers.vsSettings.set(state.camera.pos, 4 * 4 * 3);

  
  const adapter = await navigator.gpu?.requestAdapter();
  const device = await adapter?.requestDevice({
    requiredLimits: {
      maxStorageBufferBindingSize: 1024 * 1024 * 512, // 512 MB
      maxBufferSize: 1024 * 1024 * 512, // 512 MB
    }
  });
  if (!device) { 
    alert('need a browser that supports WebGPU');
    return;
  }  
  
  // Get a WebGPU context from the canvas and configure it
  const canvas =  document.getElementById('webgpu_canvas');
  const debugElement = document.getElementsByClassName('debug')[0];
  canvas.width = config.outputWidth;
  canvas.height = config.outputHeight;
  const context =  canvas.getContext('webgpu');
  
  if(!context) {
    console.error('need a browser that supports WebGPU');
    return;
  } else{
    console.log('Context created successfully');
  }

  const canvasInfo = {
    canvas,
    presentationFormat: navigator.gpu.getPreferredCanvasFormat(),
    depthTextureView: null,
  }

  context.configure({  
    device,
    format: canvasInfo.presentationFormat,
  });

  //Setup Stages
  const noiseStage = setupNoiseStage(device, config);
  const debugNoiseStage = setupDebugNoiseStage(device, config, noiseStage.noiseTexture, canvasInfo.presentationFormat);
  const marchingCubesStage = setupMarchingCubesStage(device, config, noiseStage.noiseTexture);
  const renderingStage = setupRenderingStage(device, config, canvasInfo.presentationFormat);

  //Setup UI / Input
  setupUI(config, state, noiseStage, marchingCubesStage, renderingStage);
  setupInput(config, state, canvas)

  async function render(time) {   
    const deltaTime = time - state.time;
    state.time = time;

    
    
    const cameraRotationMatrix = mat4.fromQuat(mat4.create(), state.camera.rotation);
    
    /* Update Position */
    const move_vector = vec3.fromValues(
        state.keyboard.d - state.keyboard.a, 
        state.keyboard[' '] - state.keyboard.Control,
        state.keyboard.s - state.keyboard.w,
    );    
    
    vec3.normalize(move_vector, move_vector);
    vec3.transformMat4(move_vector, move_vector, cameraRotationMatrix);
    vec3.scale(move_vector, move_vector, config.speed);
    vec3.add(state.camera.pos, state.camera.pos, move_vector);
  
    /* Update Camera Matrices / Buffers */
    
    mat4.multiply(state.camera.view_mat, cameraRotationMatrix, mat4.create()); // Rotate
    mat4.translate(state.camera.view_mat , state.camera.view_mat, vec3.negate(vec3.create(), state.camera.pos)); // Translate
    mat4.perspectiveZO(state.camera.proj_mat, state.camera.fov * Math.PI / 180, canvas.width / canvas.height, 0.1, 1000); // Projection Matrix

    quat.normalize(state.camera.rotation, state.camera.rotation);

    //localBuffers.vsSettingsBuffer.set(state.camera.model_mat, 0);
    localBuffers.vsSettings.set(state.camera.view_mat, 4 * 4);
    localBuffers.vsSettings.set(state.camera.proj_mat, 4 * 4 * 2);
    localBuffers.vsSettings.set(state.camera.pos, 4 * 4 * 3);
    device.queue.writeBuffer(renderingStage.vsSettingsBuffer, 0, localBuffers.vsSettings);

    const encoder = device.createCommandEncoder({label: 'Command encoder'});
    const pass = encoder.beginComputePass({label: 'Compute pass'});
    
    /* Noise Stage */
    pass.setPipeline(noiseStage.pipeline);
    pass.setBindGroup(0, noiseStage.bindGroup);
    pass.dispatchWorkgroups(config.cellCountX / 4, config.cellCountY / 4, config.cellCountZ /4);
    
    /* Marching Cubes Stage */
    if(config.animateIsoValue === true) {
      marchingCubesStage.settings.isoValue = Math.sin(time / 400) / 40 + 0.5;  
      marchingCubesStage.updateSettingsBuffer();
    }

    pass.setPipeline(marchingCubesStage.pipeline);
    pass.setBindGroup(0, marchingCubesStage.bindGroup);
    pass.dispatchWorkgroups(config.cellCountX / 4, config.cellCountY / 4, config.cellCountZ /4);
    // pass.dispatchWorkgroups(1, 1, 1);
    pass.end();

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

    debugElement.innerText = `FPS: ${Math.round(1000 / deltaTime)}
    Position: x: ${state.camera.pos[0].toFixed(2)} y: ${state.camera.pos[1].toFixed(2)} z: ${state.camera.pos[2].toFixed(2)}
    Rotation: x: ${state.camera.rotation[0].toFixed(2)} y: ${state.camera.rotation[1].toFixed(2)} z: ${state.camera.rotation[2].toFixed(2)} w: ${state.camera.rotation[3].toFixed(2)}\n
    Model_Mat: ${matToString(state.camera.model_mat)}
    \nView_Mat: ${matToString(state.camera.view_mat)} 
    \nProj_Mat: ${matToString(state.camera.proj_mat)}`

    state.frameCount++;

    //Reset needed buffers for next frame
    device.queue.writeBuffer(marchingCubesStage.indirectArgsBuffer, 0, new Uint32Array([0, 0, 1, 0, 0, 0]));

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}


init();
  
