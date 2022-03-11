import { assert } from "../assert.js";
export class Table {
    constructor(columns) {
        this.columns = columns;
        this.tableElem = document.createElement("table");
        this.tableElem.style.tableLayout = "fixed";
    }
    addRow(elements) {
        assert(elements.length == this.columns);
        let r = this.tableElem.insertRow();
        elements.forEach(e => {
            let c = r.insertCell();
            c.appendChild(e);
        });
    }
    getHTML() {
        return this.tableElem;
    }
}
