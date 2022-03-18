import { assert } from "./assert.js";
import { vecAdd } from "./generic/math/array_vector_math.js";
import { nChooseK } from "./generic/math/extra_math.js";
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
    getNumNeighbours() {
        return this.offsets.length;
    }
}
export class TransitionRule {
    constructor(numDimensions, neigbourhood, numStates) {
        assert(numDimensions > 0, "Dimensions must be > 0");
        assert(neigbourhood.getNumDimensions() === numDimensions, "Neibourhood number of dimensions does not match those for transition rule.");
        this.numDimensions = numDimensions;
        this.neigbourhood = neigbourhood;
        this.numStates = numStates;
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
        return this.successor(cellValue, total);
    }
    successor(startState, numNeighbours) {
        for (let i = 0; i < this.singleStateRules[startState].transitions.length; ++i) {
            let ssr = this.singleStateRules[startState].transitions[i];
            if (ssr.range.contains(numNeighbours)) {
                return ssr.endState;
            }
        }
        return startState;
    }
    langtonLambdaParameter() {
        let deadStateTransitions = 0;
        let liveStateTransitions = 0;
        const numNeighbours = this.getNeigbourhood().getNumNeighbours();
        const numStates = this.getNumStates();
        for (let state = 0; state < numStates; ++state) {
            for (let n = 0; n <= numNeighbours; ++n) {
                if (this.successor(state, n) === 0) {
                    deadStateTransitions += nChooseK(numNeighbours, n);
                }
                else {
                    liveStateTransitions += nChooseK(numNeighbours, n);
                }
            }
        }
        const totalTransitions = deadStateTransitions + liveStateTransitions;
        console.log("Total: " + totalTransitions + "    dead:  " + deadStateTransitions + "    live: " + liveStateTransitions);
        return (totalTransitions - deadStateTransitions) / totalTransitions;
    }
    makeShaderTransitionFunction() {
        let f = "uint totalisticTransitionFunction(uint x, uint n) {";
        for (let i = 0; i < this.singleStateRules.length; ++i) {
            const rule = this.singleStateRules[i];
            f += (i == 0 ? "\nif" : "\nelse if");
            f += `(x == ${rule.startState}u) {\n`;
            for (let j = 0; j < rule.transitions.length; ++j) {
                const transition = rule.transitions[j];
                const range = transition.range;
                f += (j == 0 ? "\n  if" : "\n   else if");
                f +=
                    `(n >= ${range.getStart()}u && n <= ${range.getEnd()}u) {
        return ${transition.endState}u;
    }\n`;
            }
            f += "}\n";
        }
        f += "\nreturn x;\n";
        f += "}";
        return f;
    }
}
