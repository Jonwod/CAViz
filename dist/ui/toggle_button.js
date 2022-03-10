export class ToggleButton {
    constructor(src1, src2, size = null) {
        this.state = false;
        let img = document.createElement("img");
        let that = this;
        img.src = src1;
        this.html = img;
        img.width = size.x;
        img.height = size.y;
        img.addEventListener('click', (e) => {
            img.src = that.state ? src1 : src2;
            that.state = !that.state;
        });
    }
    getHTML() {
        return this.html;
    }
    getState() {
        return this.state;
    }
}
