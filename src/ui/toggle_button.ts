export class ToggleButton {
    constructor(src1: string, src2: string, size: {x: number, y: number} = null) {
        let img = document.createElement("img");
        let that = this;

        img.src = src1;
        // this.src1 = src1;
        // this.src2 = src2;
        this.html = img;

        img.width = size.x;
        img.height = size.y;

        img.addEventListener('click', (e) => {
            img.src = that.state ? src1 : src2;
            that.state = !that.state;
        });
    }

    public getHTML(): HTMLElement {
        return this.html;
    }

    public getState(): boolean {
        return this.state;
    }

    private html: HTMLElement;
    // private src1: string;
    // private src2: string;
    private state: boolean = false;
}
