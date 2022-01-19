declare var mat4: any;
import * as keyboard from './keyboard.js';
import {Vec3} from './generic/math/vec3.js';

export class Camera {
    private fov: number;
    private aspect: number;
    private nearClip: number;
    private farClip: number;
    // radians per unit time
    private keyRotateRate: number = 0.1;
    private mouseRotateRate: number = 0.01;
    private mouseZoomRate: number = 0.1;
    private translateRate: number = 0.1;
    // private rotationOrigin: Vec3 = new Vec3(0, 0, 0);
    private yaw = 0.2;
    private pitch = 0.2;
    private x = 0;
    private y = 0;
    private z = -300;

    constructor( canvas: HTMLElement, fieldOfView: number, aspectRatio: number, nearClip: number, farClip: number) {
        this.fov = fieldOfView;
        this.aspect = aspectRatio;
        this.nearClip = nearClip;
        this.farClip = farClip;

        let that = this;
        canvas.addEventListener('wheel', (e) => {that.onWheelHandler(e)}, false);
        canvas.addEventListener('mousedown', (e) => {that.onClickHandler(e)}, false);
        canvas.addEventListener('mousemove', (e) => {that.mouseMoveHandler(e)}, false);
    }

    public setAspectRatio(aspect: number) {
        this.aspect = aspect;
    }

    public getPerspectiveMatrix() {
        let perspectiveMatrix = mat4.create();
        mat4.perspective(perspectiveMatrix,
                         this.fov,
                         this.aspect,
                         this.nearClip,
                         this.farClip);
        mat4.translate(perspectiveMatrix, perspectiveMatrix, [this.x, this.y, this.z]);
        mat4.rotateX(perspectiveMatrix, perspectiveMatrix, this.pitch);
        mat4.rotate(perspectiveMatrix, perspectiveMatrix, this.yaw, [0,1,0]);
        // console.log("yaw " + this.yaw + " , pitch " + this.pitch);
        return perspectiveMatrix;
    }

    public processInput() {
        // TODO: factor in delta time
        if(keyboard.isKeyDown("KeyX")) {
            this.x += this.translateRate;
        }
        if(keyboard.isKeyDown("KeyY")) {
            this.y += this.translateRate;
        }
        if(keyboard.isKeyDown("KeyZ")) {
            this.z -= this.translateRate;
        }

        if(keyboard.isKeyDown("KeyW")) {
            this.pitch += this.translateRate;
        }
        if(keyboard.isKeyDown("KeyS")) {
            this.pitch -= this.translateRate;
        }

        if(keyboard.isKeyDown("KeyA")) {
            this.yaw += this.keyRotateRate;
        }
        if(keyboard.isKeyDown("KeyD")) {
            this.yaw -= this.keyRotateRate;
        }
    }

    private keyState: {
        x: boolean;
        y: boolean;
        z: boolean;
    } = {x: false, y: false, z: false};


    private onClickHandler(event) {
        console.log(event);
    }

    private lastMousePosition: {x: number, y: number} = {x: NaN, y: NaN};

    
    private mouseMoveHandler(event: MouseEvent) {
        // The problem is that this doesnt work in callback
        if(event.buttons > 0) {
            if(!isNaN(this.lastMousePosition.x)) {
                const dx = event.clientX - this.lastMousePosition.x;
                this.yaw += dx * this.mouseRotateRate;
            }
            if(!isNaN(this.lastMousePosition.y)) {
                const dy = event.clientY - this.lastMousePosition.y;
                this.pitch += dy * this.mouseRotateRate;
            }

            this.lastMousePosition = {x: event.clientX, y: event.clientY};
            
        } else {
            this.lastMousePosition = {x: NaN, y: NaN};
        }
    }

    private onWheelHandler(event: WheelEvent) {
        this.z += event.deltaY * this.mouseZoomRate;
    }
}
