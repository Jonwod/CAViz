import { assert } from "./assert.js";
import { TransitionRule } from "./transition_rule.js";
import { Configuration } from "./configuration.js";
import { Range } from "./range.js";


export class CellularAutomaton {
    /**
     * Throws an Error if parameters are invalid
     */
    constructor(numStates: number, numDimensions: number, transitionRule: TransitionRule) {
        assert(numStates > 1, "Must have at least two possible states");
        assert(numDimensions > 0, "Must have at least one dimension");
        assert(transitionRule.getNumDimensions() == numDimensions, 
        "Transition rule num dimensions must match the cellular automaton's");
        this.numStates = numStates;
        this.numDimensions = numDimensions;
        this.transitionRule = transitionRule;
    }

    public makeRandomConfiguration(size: number, populationDensity: number): Configuration {
        return Configuration.makeRandom(this.numDimensions, size, this.numStates, populationDensity);
    }

    public getNumStates(): number {
        return this.numStates;
    }

    public getNumDimensions(): number {
        return this.numDimensions;
    }

    public getTransitionRule(): TransitionRule {
        return this.transitionRule;
    }

    private numStates: number;
    private numDimensions: number;
    private transitionRule: TransitionRule;

    // neigbourhood definition

    // transition function:
    //    takes an 

    // configuration: an assignment of state to each cell
}


export interface TotalisticCAParameters {
    stayAlive: Range;
    reproduce: Range;
    dimensions: number;
}