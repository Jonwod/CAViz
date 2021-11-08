declare var mat4: any;

export class Camera {
    // private fov: number;
    // private aspect: number;
    // private nearClip: number;
    // private farClip: number;
    private perspectiveMatrix;
    constructor(fieldOfView: number, aspectRatio: number, nearClip: number, farClip: number) {
        // this.fov = fieldOfView;
        // this.aspect = aspectRatio;
        // this.nearClip = nearClip;
        // this.farClip = farClip;

        this.perspectiveMatrix = mat4.create();
        mat4.perspective(this.perspectiveMatrix,
                         fieldOfView,
                         aspectRatio,
                         nearClip,
                         farClip);
    }

    public getPerspectiveMatrix() {
        return this.perspectiveMatrix;
    }

}
