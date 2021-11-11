import * as keyboard from './keyboard.js';
export class Camera {
    constructor(canvas, fieldOfView, aspectRatio, nearClip, farClip) {
        this.keyRotateRate = 0.1;
        this.mouseRotateRate = 0.01;
        this.mouseZoomRate = 0.1;
        this.translateRate = 0.1;
        this.yaw = 0;
        this.pitch = 0;
        this.x = 0;
        this.y = 0;
        this.z = -10;
        this.keyState = { x: false, y: false, z: false };
        this.lastMousePosition = { x: NaN, y: NaN };
        this.fov = fieldOfView;
        this.aspect = aspectRatio;
        this.nearClip = nearClip;
        this.farClip = farClip;
        let that = this;
        canvas.addEventListener('wheel', (e) => { that.onWheelHandler(e); }, false);
        canvas.addEventListener('mousedown', (e) => { that.onClickHandler(e); }, false);
        canvas.addEventListener('mousemove', (e) => { that.mouseMoveHandler(e); }, false);
    }
    setAspectRatio(aspect) {
        this.aspect = aspect;
    }
    getPerspectiveMatrix() {
        let perspectiveMatrix = mat4.create();
        mat4.perspective(perspectiveMatrix, this.fov, this.aspect, this.nearClip, this.farClip);
        mat4.translate(perspectiveMatrix, perspectiveMatrix, [this.x, this.y, this.z]);
        mat4.rotateX(perspectiveMatrix, perspectiveMatrix, this.pitch);
        mat4.rotate(perspectiveMatrix, perspectiveMatrix, this.yaw, [0, 1, 0]);
        return perspectiveMatrix;
    }
    processInput() {
        if (keyboard.isKeyDown("KeyX")) {
            this.x += this.translateRate;
        }
        if (keyboard.isKeyDown("KeyY")) {
            this.y += this.translateRate;
        }
        if (keyboard.isKeyDown("KeyZ")) {
            this.z -= this.translateRate;
        }
        if (keyboard.isKeyDown("KeyW")) {
            this.pitch += this.translateRate;
        }
        if (keyboard.isKeyDown("KeyS")) {
            this.pitch -= this.translateRate;
        }
        if (keyboard.isKeyDown("KeyA")) {
            this.yaw += this.keyRotateRate;
        }
        if (keyboard.isKeyDown("KeyD")) {
            this.yaw -= this.keyRotateRate;
        }
    }
    onClickHandler(event) {
        console.log(event);
    }
    mouseMoveHandler(event) {
        if (event.buttons > 0) {
            if (!isNaN(this.lastMousePosition.x)) {
                const dx = event.clientX - this.lastMousePosition.x;
                this.yaw += dx * this.mouseRotateRate;
            }
            if (!isNaN(this.lastMousePosition.y)) {
                const dy = event.clientY - this.lastMousePosition.y;
                this.pitch += dy * this.mouseRotateRate;
            }
            this.lastMousePosition = { x: event.clientX, y: event.clientY };
            console.log("yaw: " + this.yaw + "  pitch: " + this.pitch);
        }
        else {
            this.lastMousePosition = { x: NaN, y: NaN };
        }
    }
    onWheelHandler(event) {
        this.z += event.deltaY * this.mouseZoomRate;
    }
}
