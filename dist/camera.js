export class Camera {
    constructor(fieldOfView, aspectRatio, nearClip, farClip) {
        this.fov = fieldOfView;
        this.aspect = aspectRatio;
        this.nearClip = nearClip;
        this.farClip = farClip;
    }
    setAspectRatio(aspect) {
        this.aspect = aspect;
    }
    getPerspectiveMatrix() {
        let perspectiveMatrix = mat4.create();
        mat4.perspective(perspectiveMatrix, this.fov, this.aspect, this.nearClip, this.farClip);
        return perspectiveMatrix;
    }
}
