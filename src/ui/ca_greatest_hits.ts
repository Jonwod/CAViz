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
        let entries: {name: string, ca: TotalisticCAParameters, pop: number}[] = [
            {name: "Conway's game of Life", ca: {stayAlive: new Range(2, 3), reproduce: new Range(3, 3), dimensions: 2}, pop: null},
            {name: "Bays' (5766) rule", ca: {stayAlive: new Range(5, 7), reproduce: new Range(6, 6), dimensions: 3}, pop: null},
            {name: "Bays' (4555) rule", ca: {stayAlive: new Range(4, 5), reproduce: new Range(5, 5), dimensions: 3}, pop: null},
            {name: "Blobs (10 21 10 21)", ca: {stayAlive: new Range(10, 21), reproduce: new Range(10, 21), dimensions: 3}, pop: 0.25},
        ];

        for(let i = 0; i < entries.length; ++i) {
            t.addRow(this.makeEntry(entries[i].name, entries[i].ca, entries[i].pop));
        }

        this.div.appendChild(t.getHTML());
    }

    /**
     * Supports one listener at a time.
     * @param callback This function will be called when a CA is selected in this panel
     *                 First argument will be name of selected CA, second will be the CA
     *                 details. The third argument is the population density override, if there
     *                  is one, otherwise null.
     */
    public bindToOnSelected(callback: (name: string, ca: TotalisticCAParameters, popDensity: number) => void) {
        this.callback = callback;
    }

    public getHTML(): HTMLElement {
        return this.div;
    }


    private makeEntry(name: string, ca: TotalisticCAParameters, popDensity: number): HTMLElement[] {
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

    private div: HTMLDivElement;
    private callback: (name: string, ca: TotalisticCAParameters, popDensity: number) => void;
}