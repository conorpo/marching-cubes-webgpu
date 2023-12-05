import { quat } from 'gl-matrix';

export function setupInput(config, state, canvas) {
    // window.addEventListener('beforeunload', (e) => {
    //     e.preventDefault();
    //     for(let key in state.keyboard){
    //         state.keyboard[key] = false;
    //     }
    // }, true);

    window.addEventListener('keydown', (e) => {
        if(Object.keys(state.keyboard).includes(e.key)){
            e.preventDefault();
            state.keyboard[e.key] = true;
        }
    });
    window.addEventListener('keyup', (e) => {
        console.log(e.key)
        if(Object.keys(state.keyboard).includes(e.key)){
            e.preventDefault();
            state.keyboard[e.key] = false;
        }
    });

    canvas.addEventListener('click', (e) => {
        // conso
        if(document.pointerLockElement === canvas){
            document.exitPointerLock();
        } else {
            canvas.requestPointerLock();
            document.documentElement.requestFullscreen();
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        if(document.pointerLockElement !== canvas) return;

        quat.rotateY(state.camera.rotation, state.camera.rotation, e.movementX * 0.0003);
        //quat.rotateX(state.camera.rotation, state.camera.rotation, e.movementY * 0.0003);
    });

    canvas.addEventListener('pointerlockchange', (e) => {
        if(document.pointerLockElement !== canvas){
            for(let key in state.keyboard){
                state.keyboard[key] = false;
            }
        }
    });
}