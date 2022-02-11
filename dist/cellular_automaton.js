import { assert } from "./assert.js";
import { Configuration } from "./configuration.js";
export class CellularAutomaton {
    constructor(numStates, numDimensions, transitionRule) {
        assert(numStates > 1, "Must have at least two possible states");
        assert(numDimensions > 0, "Must have at least one dimension");
        assert(transitionRule.getNumDimensions() == numDimensions, "Transition rule num dimensions must match the cellular automaton's");
        this.numStates = numStates;
        this.numDimensions = numDimensions;
        this.transitionRule = transitionRule;
    }
    makeRandomConfiguration(size, populationDensity) {
        return Configuration.makeRandom(this.numDimensions, size, this.numStates, populationDensity);
    }
    getNumStates() {
        return this.numStates;
    }
    getNumDimensions() {
        return this.numDimensions;
    }
    getTransitionRule() {
        return this.transitionRule;
    }
}
