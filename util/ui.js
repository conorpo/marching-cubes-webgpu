import * as dat from 'dat.gui';

export function setupUI(config, state, noiseStage, marchingCubesStage, renderingStage, camera){
    const gui = new dat.GUI();
    const debugDisplay = document.getElementsByClassName("debug")[0];

    let generalFolder = gui.addFolder('General Settings');
    let noiseFolder = gui.addFolder('Noise Settings');
    let marchingCubesFolder = gui.addFolder('Marching Cubes Settings');
    let renderingFolder = gui.addFolder('Render Settings');

    generalFolder.add(config, 'toggleDebugNoise');

    //Noise Settings
    noiseFolder.add(noiseStage.settings, 'scale', 0.05, 0.15).onChange(()=>{
        noiseStage.updateSettingsBuffer();
    });

    
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


    //General Settigns
    generalFolder.add(config, 'toggleDebugDisplay').onChange(()=>{
        if(config.toggleDebugDisplay === true){
            debugDisplay.style.display = "block";
        } else{
            debugDisplay.style.display = "none";
        }
    });

    return gui;
}


export function matToString(mat) {
    let str = "\n";
    for(let r = 0; r < 4; r++){
        for(let c = 0; c < 4; c++){
            str += mat[r + c*4].toFixed(1).padStart(4,'+') + ", ";
        }
        str += "\n";
    }
    return str;
}