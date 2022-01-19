export class TopPanel {
    constructor() {
        this.mainDiv = document.createElement('div');
        this.newCAButton = document.createElement('button');
        let that = this;
    }
    getHTML() {
        return this.mainDiv;
    }
}
