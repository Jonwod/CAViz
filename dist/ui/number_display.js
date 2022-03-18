export class NumberDisplay {
    constructor(decimalPlaces) {
        let p = document.createElement("p");
        let n = 0;
        this.decimalPlaces = decimalPlaces;
        p.innerHTML = n.toFixed(decimalPlaces);
        this.p = p;
    }
    setValue(x) {
        this.p.innerHTML = x.toFixed(this.decimalPlaces).toString();
    }
    getHTML() {
        return this.p;
    }
    setHidden(hide) {
        this.p.style.visibility = hide ? "hidden" : "visible";
    }
}
