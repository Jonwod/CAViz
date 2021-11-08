declare var mat4: any;

export class Camera {
    private fov: number;
    private aspect: number;
    private nearClip: number;
    private farClip: number;
    constructor(fieldOfView: number, aspectRatio: number, nearClip: number, farClip: number) {
        this.fov = fieldOfView;
        this.aspect = aspectRatio;
        this.nearClip = nearClip;
        this.farClip = farClip;
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
        return perspectiveMatrix;
    }

}
