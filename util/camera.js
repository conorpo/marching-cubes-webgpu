
import {mat4, vec3} from "wgpu-matrix";

export const setupCamera = (config, state, renderingStage, noiseStage) => {
    const camera = {
        fov: 110,
        nearPlane: 0.1,
        farPlane: 1000,

        pitch: 0,
        yaw: 0,

        model_mat: new Float32Array(renderingStage.renderSettings.buffer, 0, 4 * 4), //Model Mat is shift the noise mesh to be centered at player
        view_mat: new Float32Array(renderingStage.renderSettings.buffer, 4 * 4 * 4, 4 * 4),
        camera_mat: new Float32Array([1, 0, 0, 0,
                                    0, 1, 0, 0,
                                    0, 0, 1, 0,
                                    0, 0, 0, 1]),

        proj_mat: new Float32Array(renderingStage.renderSettings.buffer, 4 * 4 * 4 * 2, 4 * 4),
        position: new Float32Array(renderingStage.renderSettings.buffer, 4 * 4 * 4 * 3, 4),
    };

    camera.right_ = new Float32Array(camera.camera_mat.buffer, 0, 4);
    camera.up_ = new Float32Array(camera.camera_mat.buffer, 4 * 4, 4);
    camera.back_ = new Float32Array(camera.camera_mat.buffer, 4 * 8, 4);
    camera.pos_ = new Float32Array(camera.camera_mat.buffer, 4 * 12, 4);

    camera.update = (keyboardInput, mouseInput, deltaTime) => {
        const speed = config.speed * deltaTime;

        camera.yaw -= mouseInput.movementX * deltaTime * config.mouseSensitivity;
        camera.pitch -= mouseInput.movementY * deltaTime * config.mouseSensitivity;

        camera.yaw = camera.yaw % (Math.PI * 2);
        camera.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.pitch));
        
        const position = vec3.copy(camera.pos_);
        camera.camera_mat.set(mat4.rotateX(mat4.rotationY(camera.yaw), camera.pitch));
        
        const moveDir = vec3.fromValues(
            (keyboardInput.d) - (keyboardInput.a),
            (keyboardInput[' ']) - (keyboardInput.Control),
            (keyboardInput.s) - (keyboardInput.w),
        );

        const velocity = vec3.create();

        vec3.addScaled(velocity, camera.right_, moveDir[0], velocity);
        vec3.addScaled(velocity, camera.up_, moveDir[1], velocity);
        vec3.addScaled(velocity, camera.back_, moveDir[2], velocity);
        vec3.scale(velocity, speed, velocity)
            
        camera.pos_.set(vec3.add(position, velocity));
        camera.position.set(camera.pos_)

        const noiseOrigin = vec3.sub(vec3.floor(camera.pos_), vec3.fromValues(config.cellCountX / 2, config.cellCountY / 2, config.cellCountZ / 2));
        camera.model_mat.set(mat4.translation(noiseOrigin));
        camera.view_mat.set(mat4.invert(camera.camera_mat));
        noiseStage.localSettingsBuffer.set(noiseOrigin, 4);
    }

    camera.update_projection = () => {
        const aspect = config.outputWidth / config.outputHeight;
        camera.proj_mat.set(mat4.perspective(camera.fov / 180 * Math.PI, aspect, camera.nearPlane, camera.farPlane));
    };
    camera.update_projection();
    

    return camera;
}
