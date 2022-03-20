import { CellularAutomaton, TotalisticCAParameters } from "../cellular_automaton.js";
import { Range } from "../range.js";
import { Table } from "./table.js";


/**
 * A UI panel listing a number of the more interesting
 * cellular automata, which can be selected.
 */
export class CAGreatestHits {
    constructor() {
        this.div = document.createElement("div");
        let heading = document.createElement('h2');
        heading.innerHTML = "Greatest Hits";
        this.div.appendChild(heading);
        let t = new Table(2);
        let entries: {name: string, ca: TotalisticCAParameters}[] = [
            {name: "Conway's game of Life", ca: {stayAlive: new Range(2, 3), reproduce: new Range(3, 3), dimensions: 2}},
            {name: "Bays' (5766) rule", ca: {stayAlive: new Range(5, 7), reproduce: new Range(6, 6), dimensions: 3}},
            {name: "Bays' (4555) rule", ca: {stayAlive: new Range(4, 5), reproduce: new Range(5, 5), dimensions: 3}}
        ];

        for(let i = 0; i < entries.length; ++i) {
            t.addRow(this.makeEntry(entries[i].name, entries[i].ca));
        }

        this.div.appendChild(t.getHTML());
    }

    /**
     * Supports one listener at a time.
     * @param callback This function will be called when a CA is selected in this panel
     *                 First argument will be name of selected CA, second will be the CA
     *                 details
     */
    public bindToOnSelected(callback: (name: string, ca: TotalisticCAParameters) => void) {
        this.callback = callback;
    }

    public getHTML(): HTMLElement {
        return this.div;
    }


    private makeEntry(name: string, ca: TotalisticCAParameters): HTMLElement[] {
        let button = document.createElement("button");
        let that = this;
        button.addEventListener('click', () => {
            that.callback(name, ca);
            console.log("hallo " + name);
        });
        button.innerHTML = name;
        let dims = document.createElement("p");
        dims.innerHTML = "(" + ca.dimensions.toString() + "D)";
        return [button, dims];
    }

    private div: HTMLDivElement;
    private callback: (name: string, ca: TotalisticCAParameters) => void;
}