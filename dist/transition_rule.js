import { assert } from "./assert.js";
import { vecAdd } from "./vector_math.js";
export class Neigbourhood {
    constructor(numDimensions, neigbours) {
        neigbours.forEach((x) => {
            assert(x.length === numDimensions, "Wrong number of dimensions (" + x.length +
                ") for " + x + " in neigbours");
        });
        this.offsets = neigbours;
        this.numDimensions = numDimensions;
    }
    static makeForDistance1(numDimensions) {
        let offsets = [];
        let offset = [];
        for (let d = 0; d < numDimensions; ++d) {
            offset.push(-1);
        }
        function nextOffset() {
            let carry = 1;
            let maxedOut = true;
            for (let i = 0; i < offset.length; ++i) {
                if (carry) {
                    if (offset[i] < 1) {
                        offset[i] += 1;
                        carry = 0;
                    }
                    else {
                        offset[i] = -1;
                    }
                }
                maxedOut = maxedOut && (offset[i] === 1);
            }
            return carry === 0;
        }
        do {
            if (!offset.every(x => x === 0)) {
                offsets.push([...offset]);
            }
        } while (nextOffset());
        return new Neigbourhood(numDimensions, offsets);
    }
    getOffsets() {
        return this.offsets;
    }
    getNumDimensions() {
        return this.numDimensions;
    }
}
export class TransitionRule {
    constructor(numDimensions, neigbourhood, numStates) {
        assert(numDimensions > 0, "Dimensions must be > 0");
        assert(neigbourhood.getNumDimensions() === numDimensions, "Neibourhood number of dimensions does not match those for transition rule.");
        this.numDimensions = numDimensions;
        this.neigbourhood = neigbourhood;
    }
    getNumDimensions() {
        return this.numDimensions;
    }
    getNeigbourhood() {
        return this.neigbourhood;
    }
    getNumStates() {
        return this.numStates;
    }
}
export class TotalisticTransitionRule extends TransitionRule {
    constructor(numDimensions, neigbourhood, numStates, individualStateRules) {
        super(numDimensions, neigbourhood, numStates);
        this.singleStateRules = [];
        for (let i = 0; i < this.getNumStates(); ++i) {
            let r = individualStateRules.find((x) => x.startState === i);
            if (typeof r !== 'undefined') {
                this.singleStateRules.push(r);
            }
            else {
                this.singleStateRules.push({ startState: i, transitions: [] });
            }
        }
        this.singleStateRules = individualStateRules;
    }
    computeSuccessorState(configuration, cell) {
        const cellValue = configuration.get(cell);
        let total = 0;
        this.getNeigbourhood().getOffsets().forEach((offset) => {
            total += configuration.get(vecAdd(cell, offset));
        });
        console.log("n: " + total);
        for (let i = 0; i < this.singleStateRules[cellValue].transitions.length; ++i) {
            let ssr = this.singleStateRules[cellValue].transitions[i];
            if (ssr.range.contains(total)) {
                return ssr.endState;
            }
        }
        return cellValue;
    }
}
