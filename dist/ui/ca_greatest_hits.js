import { Range } from "../range.js";
import { Table } from "./table.js";
export class CAGreatestHits {
    constructor() {
        this.div = document.createElement("div");
        let heading = document.createElement('h2');
        heading.innerHTML = "Greatest Hits";
        this.div.appendChild(heading);
        let t = new Table(2);
        let entries = [
            { name: "Conway's game of Life", ca: { stayAlive: new Range(2, 3), reproduce: new Range(3, 3), dimensions: 2 }, pop: null },
            { name: "Bays' (5766) rule", ca: { stayAlive: new Range(5, 7), reproduce: new Range(6, 6), dimensions: 3 }, pop: null },
            { name: "Bays' (4555) rule", ca: { stayAlive: new Range(4, 5), reproduce: new Range(5, 5), dimensions: 3 }, pop: null },
            { name: "Blobs (10 21 10 21)", ca: { stayAlive: new Range(10, 21), reproduce: new Range(10, 21), dimensions: 3 }, pop: 0.25 },
        ];
        for (let i = 0; i < entries.length; ++i) {
            t.addRow(this.makeEntry(entries[i].name, entries[i].ca, entries[i].pop));
        }
        this.div.appendChild(t.getHTML());
    }
    bindToOnSelected(callback) {
        this.callback = callback;
    }
    getHTML() {
        return this.div;
    }
    makeEntry(name, ca, popDensity) {
        let button = document.createElement("button");
        let that = this;
        button.addEventListener('click', () => {
            that.callback(name, ca, popDensity);
        });
        button.innerHTML = name;
        let dims = document.createElement("p");
        dims.innerHTML = "(" + ca.dimensions.toString() + "D)";
        return [button, dims];
    }
}
