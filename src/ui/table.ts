import { assert } from "../assert.js";

/**
 * A wrapper around an HTML table, for convinience.
 */
export class Table {
    constructor(columns: number) {
        this.columns = columns;
        this.tableElem = document.createElement("table");
        this.tableElem.style.tableLayout = "fixed";
    }

    public addRow(elements: HTMLElement[]) {
        assert(elements.length == this.columns);
        let r = this.tableElem.insertRow();
        elements.forEach(e => {
            if(e != null) {
                let c = r.insertCell();
                c.appendChild(e);
            }
        });
    }

    public getHTML(): HTMLTableElement {
        return this.tableElem;
    }

    columns: number;
    tableElem: HTMLTableElement;
}
