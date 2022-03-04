export class NumberDisplay {
    constructor(decimalPlaces: number) {
        let p = document.createElement("p");
        let n = 0;
        this.decimalPlaces = decimalPlaces;
        p.innerHTML = n.toFixed(decimalPlaces);
        this.p = p;
    }

    public setValue(x: number) {
        this.p.innerHTML = x.toFixed(this.decimalPlaces).toString();
    }

    public getHTML(): HTMLElement {
        return this.p;
    }

    decimalPlaces: number;
    p: HTMLElement;
}