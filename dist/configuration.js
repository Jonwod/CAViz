import { assert } from "./assert.js";
import { nDimensionalIterate } from "./n_dimensional_iterate.js";
import { Range } from "./range.js";
import * as ExtraMath from "./extra_math.js";
export class Configuration {
    static makeRandom(dimensions, size, numStates) {
        let c = new Configuration();
        c.cells = [];
        for (let i = 0; i < Math.pow(size, dimensions); ++i) {
            c.cells.push(Math.floor(Math.random() * numStates));
        }
        c.size = size;
        c.dimensions = dimensions;
        return c;
    }
    get(position) {
        assert(position.length === this.dimensions, "wrong number of dimensions supplied to Configuration.get()");
        for (let i = 0; i < position.length; ++i) {
            position[i] = ExtraMath.trueMod(position[i], this.size);
        }
        return this.cells[this.to1D(position)];
    }
    getNumDimensions() {
        return this.dimensions;
    }
    getSize() {
        return this.size;
    }
    update(transitionRule) {
        assert(transitionRule.getNumDimensions() === this.dimensions, "Transition rule dimensions doesn't match configuration");
        if (typeof (this.buffer) === 'undefined') {
            this.buffer = new Array(this.cells.length);
        }
        let dimensionRanges = [];
        for (let d = 0; d < this.dimensions; ++d) {
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
    to1D(position) {
        let index = 0;
        for (let i = 0; i < position.length; ++i) {
            index += position[i] * Math.pow(this.size, this.dimensions - i - 1);
        }
        assert(index < this.cells.length, `position ${position} out of bounds`);
        return index;
    }
    print1D() {
        console.log(this.cells);
    }
}
