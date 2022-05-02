import { assert } from "./assert.js";
import { nDimensionalIterate } from "./n_dimensional_iterate.js";
import { TransitionRule } from "./transition_rule.js";
import { Range } from "./range.js";
import * as ExtraMath from "./generic/math/extra_math.js";

export class Configuration {
    /**
     * An empty (all dead) configuration.
     */
    constructor(dimensions: number, size: number, numStates: number) {
        this.dimensions = dimensions;
        this.size = size;
        this.cells = new Uint8Array(Math.pow(size, dimensions));
    }

    static makeRandom(dimensions: number, size: number, numStates: number, populationDensity: number): Configuration {
        let c = new Configuration(dimensions, size, numStates);
        c.cells = new Uint8Array(Math.pow(size, dimensions));
        for(let i = 0; i < Math.pow(size, dimensions); ++i) {
            // TODO: This would be better as a probability distribution over the states
            c.cells[i] = (Math.random() < populationDensity ? (Math.floor(Math.random() * (numStates - 1)) + 1) : 0);
        }
        return c;
    }

    /**
     * 
     * @param position N-dimension coordinates of cell. If out of bounds,
     *  will modified so as to be in bounds, by modular arithmetic.
     *  Note that this will have the effect of making the space topologically
     *  a torus.
     * @returns 
     */
    public get(position: number[]): number {
        assert(position.length === this.dimensions, 
            "wrong number of dimensions supplied to Configuration.get()");
        for(let i = 0; i < position.length; ++i) {
            position[i] = ExtraMath.trueMod(position[i], this.size);
        }
        return this.cells[this.to1D(position)];
    }

    public getNumDimensions(): number {
        return this.dimensions;
    }

    public getSize(): number {
        return this.size;
    }

    /**
     * Sets the value of a cell.
     * @param position N-dimension coordinates of cell. If out of bounds,
     *  will modified so as to be in bounds, by modular arithmetic.
     *  Note that this will have the effect of making the space topologically
     *  a torus.
     */
    public set(position: number[], state: number): void {
        assert(position.length === this.dimensions, 
            "wrong number of dimensions supplied to Configuration.set()");
        for(let i = 0; i < position.length; ++i) {
            position[i] = ExtraMath.trueMod(position[i], this.size);
        }
        this.cells[this.to1D(position)] = state;
    }

    public update(transitionRule: TransitionRule) {
        assert(transitionRule.getNumDimensions() === this.dimensions, 
        "Transition rule dimensions doesn't match configuration");
        if(typeof(this.buffer) === 'undefined') {
            this.buffer = new Uint8Array(this.cells.length);
        }

        let dimensionRanges = [];
        for(let d = 0; d < this.dimensions; ++d) {
            dimensionRanges.push(new Range(0, this.size - 1));
        }
        nDimensionalIterate(dimensionRanges, (cellCoords) => {
            const flatCoords = this.to1D(cellCoords);
            this.buffer[flatCoords] = transitionRule.computeSuccessorState(this, cellCoords);
        });

        const temp = this.cells;
        this.cells = this.buffer;
        this.buffer = temp;
    }


    // Flattens N-dimensional coordinate to 1D array index
    private to1D(position: number[]): number {
        let index = 0;
        for(let i = 0; i < position.length; ++i) {
            index += position[i] * Math.pow(this.size, this.dimensions - i - 1);
        }
        assert(index < this.cells.length, `position ${position} out of bounds`);
        return index;
    }

    public print1D() {
        console.log(this.cells);
    }

    public getData(): Uint8Array {
        return this.cells;
    }

    private cells: Uint8Array;
    private buffer: Uint8Array;
    private dimensions: number;
    private size: number;
}
