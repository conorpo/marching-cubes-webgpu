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

        state.mouse.movementX = e.movementX;
        state.mouse.movementY = e.movementY;
    });

    canvas.addEventListener('pointerlockchange', (e) => {
        if(document.pointerLockElement !== canvas){
            for(let key in state.keyboard){
                state.keyboard[key] = false;
            }
        }
    });
}