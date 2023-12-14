import * as dat from 'dat.gui';

export function setupUI(config, state, noiseStage, marchingCubesStage, renderingStage, camera, debugNoiseStage){
    const gui = new dat.GUI();
    const debugDisplay = document.getElementsByClassName("debug")[0];

    const generalFolder = gui.addFolder('General Settings');
    const noiseFolder = gui.addFolder('Noise Settings');
    const marchingCubesFolder = gui.addFolder('Marching Cubes Settings');
    const renderingFolder = gui.addFolder('Render Settings');

    generalFolder.add(config, 'toggleDebugNoise');

    //Noise Settings
    noiseFolder.add(noiseStage.settings, 'scale', 0.01, 0.15).onChange(()=>{
        noiseStage.localSettingsBuffer[0] = noiseStage.settings.scale;
    });
    noiseFolder.add(noiseStage.settings, 'blockiness', 0.0, 1.0).onChange(()=> {
        noiseStage.localSettingsBuffer[1] = noiseStage.settings.blockiness;
    });
    
    const cellCountsSubfolder = noiseFolder.addFolder('Cell Counts');
    const cellCountsSubfolderTitleElement = cellCountsSubfolder.domElement.children[0].children[0];
    let overMaxBufferSize = false;

    const verifyBufferSize = () => {
        const cellCount = config.cellCountX * config.cellCountY * config.cellCountZ;
        const bufferSize = cellCount * 12 * 3 * 4; //12 max verts per cell, 3 floats per vert attrib, 4 bytes per float

        if(bufferSize > config.maxBufferSize) {
            if(!overMaxBufferSize) {
                cellCountsSubfolderTitleElement.style.color = "red";
                cellCountsSubfolderTitleElement.innerText = "(Max Buffer Size Exceeded)";
                overMaxBufferSize = true;
            }
            return;
        } else if(overMaxBufferSize) {
            cellCountsSubfolderTitleElement.style.color = "white";
            cellCountsSubfolderTitleElement.innerText = "Cell Counts";
            overMaxBufferSize = false;
        }
        
        noiseStage.createNoiseTexture();
        marchingCubesStage.createBindGroup(noiseStage.noiseTexture);
        debugNoiseStage.createBindGroup(noiseStage.noiseTexture);
    }

    cellCountsSubfolder.add(config, 'cellCountX', 4, 200, 4).onChange(verifyBufferSize);
    cellCountsSubfolder.add(config, 'cellCountY', 4, 200, 4).onChange(verifyBufferSize);
    cellCountsSubfolder.add(config, 'cellCountZ', 4, 200 ,4).onChange(verifyBufferSize);
    
    //Marching Cubes Settings
    marchingCubesFolder.add(config, 'animateIsoValue').onChange(()=>{
        marchingCubesStage.updateSettingsBuffer();
    });
    marchingCubesFolder.add(marchingCubesStage.settings, 'isoValue', 0, 1.0).onChange(() => {
        marchingCubesStage.updateSettingsBuffer();
    });
    marchingCubesFolder.add(marchingCubesStage.settings, 'interpolationFactor', 0, 1.0).onChange(() => {
        marchingCubesStage.updateSettingsBuffer();
    });

    //Rendering Settings
    renderingFolder.add(camera, 'fov', 45, 180).onChange(()=>{
        camera.update_projection();
    });

    const materialBuffer = new Float32Array(renderingStage.renderSettings.buffer, 4*(4*4*3 + 4), 4);
    materialBuffer.set([config.ambient_factor, config.diffuse_factor, config.specular_factor, config.shininess]);

    renderingFolder.add(config, 'ambient_factor', 0, 1.0).onChange(()=>{
        materialBuffer[0] = config.ambient_factor;
    });
    renderingFolder.add(config, 'diffuse_factor', 0, 1.0).onChange(()=>{
        materialBuffer[1] = config.diffuse_factor;
    });
    renderingFolder.add(config, 'specular_factor', 0, 1.0).onChange(()=>{
        materialBuffer[2] = config.specular_factor;
    });
    renderingFolder.add(config, 'shininess', 0.1, 100).onChange(()=>{
        materialBuffer[3] = config.shininess;
    });

    return gui;
}