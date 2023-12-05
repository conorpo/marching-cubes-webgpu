import * as dat from 'dat.gui';

export function setupUI(config, state, noiseStage, marchingCubesStage, renderingStage){
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
    renderingFolder.add(state.camera, 'fov', 45, 180);


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
    for (let i = 0; i < mat.length; i++) {
        str += mat[i].toFixed(1).padStart(4,'+') + ", ";
        if((i + 1) % 4 === 0 && i !== mat.length - 1){
            str += "\n";
        }
    }
    return str;
}