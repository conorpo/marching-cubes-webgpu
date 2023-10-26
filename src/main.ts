async function init() {
  //Get a WebGPU device  
  const adapter = await navigator.gpu?.requestAdapter();
  const device = await adapter?.requestDevice();
  if (!device) { 
    alert('need a browser that supports WebGPU');
    return;
  }
  
  // Get a WebGPU context from the canvas and configure it
  const canvas = <HTMLCanvasElement> document.getElementById('webgpu_canvas');
  const {width, height} = canvas;
  const context = <GPUCanvasContext> canvas.getContext('webgpu');
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  context.configure({  
    device,
    format: presentationFormat,
  });
}

init();
  
