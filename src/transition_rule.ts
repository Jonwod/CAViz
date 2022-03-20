import { assert } from "./assert.js";
import {Configuration} from "./configuration.js";
import {vecAdd} from "./generic/math/array_vector_math.js";
import {Range} from "./range.js";
import { nChooseK } from "./generic/math/extra_math.js";

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
        this.numStates = numStates;
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

    /**
     * Langton's Lambda parameter is the fraction of transition rules
     * that produce a live cell. This turns out to be a heuristic for
     * predicting the "complexity" of behaviour for a given rule.
     */
    abstract langtonLambdaParameter(): number;

    private neigbourhood: Neigbourhood;
    private numDimensions: number;
    private numStates: number;
}

/**
 * Specifies the transitions for a particular start state.
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

        return this.successor(cellValue, total);
    }

    private successor(startState: number, numNeighbours: number): number {
        for(let i = 0; i < this.singleStateRules[startState].transitions.length; ++i) {
            let ssr = this.singleStateRules[startState].transitions[i];
            if(ssr.range.contains(numNeighbours)) {
                return ssr.endState;
            }
        }
        return startState;
    }

    /**
     * Langton's Lambda parameter is the fraction of transition rules
     * that produce a live cell. This turns out to be a heuristic for
     * predicting the "complexity" of behaviour for a given rule.
     * State 0 is assumed to be the dead or "quiescent" state
    */
    public langtonLambdaParameter(): number {
        let deadStateTransitions = 0;
        let liveStateTransitions = 0;
        const numNeighbours: number = this.getNeigbourhood().getNumNeighbours();
        const numStates: number = this.getNumStates();
        for(let state = 0; state < numStates; ++state) {
            for(let n = 0; n <= numNeighbours; ++n) {
                if(this.successor(state, n) === 0) {
                    deadStateTransitions += nChooseK(numNeighbours, n);
                } else {
                    liveStateTransitions += nChooseK(numNeighbours, n);
                    // console.log("live state transitions: " + );
                }
            }
        }
        const totalTransitions = deadStateTransitions + liveStateTransitions;
        console.log("Total: " + totalTransitions  +  "    dead:  " + deadStateTransitions + "    live: " + liveStateTransitions);
        return (totalTransitions - deadStateTransitions) / totalTransitions;
    }
    

    /**
     * Returns a GLSL function with the signature
     * uint totalisticTransitionFunction(uint currentValue, uint neighbourSum);
     */
    public makeShaderTransitionFunction(): string {
        let f = "uint totalisticTransitionFunction(uint x, uint n) {";
        for(let i = 0; i < this.singleStateRules.length; ++i) {
            const rule = this.singleStateRules[i];
            f += (i == 0 ? "\nif" : "\nelse if");
            // That u on the end is because we are using unsigned ints for states
            f += `(x == ${rule.startState}u) {\n`;
            for(let j = 0; j < rule.transitions.length; ++j) {
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

    private singleStateRules: SingleStateTotalisticTransitionRule[];
}



