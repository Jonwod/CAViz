import { assert } from "./assert.js";
import {Configuration} from "./configuration.js";
import {vecAdd} from "./vector_math.js";
import {Range} from "./range";

export class Neigbourhood {
    static makeForDistance1(numDimensions: number): Neigbourhood {
        let offsets: number[][] = [];
        let offset: number[] = [];
        for(let d = 0; d < numDimensions; ++d) {
            offset.push(-1);
        }

        // returns false after there are no more values to iterate
        function nextOffset(): boolean {
            let carry = 1;
            let maxedOut = true;
            for(let i = 0; i < offset.length; ++i) {
                if(carry) {
                    if(offset[i] < 1) {
                        offset[i] += 1;
                        carry = 0;
                    } else {
                        offset[i] = -1;
                    }
                }
                maxedOut = maxedOut  &&  (offset[i] === 1);
            }
            return carry === 0;
        }

        do {
            if(!offset.every(x => x === 0)) {
                offsets.push([...offset]);
            }
        } while(nextOffset());

        return new Neigbourhood(numDimensions, offsets);
    }

    /**
     * 
     * @param numDimensions Specifies dimensionality, n
     * @param neigbours An array of n-dimensional offsets
     */
    constructor(numDimensions: number, neigbours: number[][]) {
        neigbours.forEach((x) => {
            assert(x.length === numDimensions, "Wrong number of dimensions (" + x.length +
                ") for " + x + " in neigbours");
        });
        this.offsets = neigbours;
        this.numDimensions = numDimensions;
    }    

    public getOffsets(): number[][] {
        return this.offsets;
    }

    public getNumDimensions(): number {
        return this.numDimensions;
    }

    public getNumNeighbours(): number {
        return this.offsets.length;
    }

    private offsets: number[][];
    private numDimensions: number;
}


export abstract class TransitionRule {
    /**
     * Throws an Error if parameters are invalid
     */
    constructor(numDimensions: number, neigbourhood: Neigbourhood, numStates: number) {
        assert(numDimensions > 0, "Dimensions must be > 0");
        assert(neigbourhood.getNumDimensions() === numDimensions, 
            "Neibourhood number of dimensions does not match those for transition rule.");
        this.numDimensions = numDimensions;
        this.neigbourhood = neigbourhood;
    }

    public getNumDimensions(): number {
        return this.numDimensions;
    }

    public getNeigbourhood(): Neigbourhood {
        return this.neigbourhood;
    }

    public getNumStates(): number {
        return this.numStates;
    }
    
    abstract computeSuccessorState(configuration: Configuration, cell: number[]): number;

    private neigbourhood: Neigbourhood;
    private numDimensions: number;
    private numStates: number;
}

/**
 * Specifies the transitions for a particular state.
 * 
 */
export interface SingleStateTotalisticTransitionRule {
    startState: number;
    transitions: {
        endState: number;
        range: Range;
    }[];
}


export class TotalisticTransitionRule extends TransitionRule {
    /**
     * @param individualStateRules Provides the ranges of values for which each state transitions
     *                             No value for a paricular range indicates no transition.
     */
    constructor(numDimensions: number, 
        neigbourhood: Neigbourhood, 
        numStates: number,
        individualStateRules: SingleStateTotalisticTransitionRule[]) {
        super(numDimensions, neigbourhood, numStates);
        this.singleStateRules = [];
        for(let i = 0; i < this.getNumStates(); ++i) {
            let r = individualStateRules.find((x) => x.startState === i);
            if(typeof r !== 'undefined') {
                this.singleStateRules.push(r);
            } else {
                this.singleStateRules.push({startState: i, transitions: []});
            }
        }
        this.singleStateRules = individualStateRules;
    }

    public computeSuccessorState(configuration: Configuration, cell: number[]): number {
        const cellValue = configuration.get(cell);
        let total = 0;

        this.getNeigbourhood().getOffsets().forEach((offset) => {
            total += configuration.get(vecAdd(cell, offset));
        });

        console.log("n: " + total);

        for(let i = 0; i < this.singleStateRules[cellValue].transitions.length; ++i) {
            let ssr = this.singleStateRules[cellValue].transitions[i];
            if(ssr.range.contains(total)) {
                return ssr.endState;
            }
        }

        return cellValue;
    }

    private singleStateRules: SingleStateTotalisticTransitionRule[];
}