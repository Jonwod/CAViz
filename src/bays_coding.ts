import { TotalisticTransitionRule } from "./transition_rule.js";
import { Neigbourhood } from "./transition_rule.js";
import { Range } from "./range.js";
/**
 * A convinience function for generating rules from the 4-number coding
 * specified in Bays' "Candidates for the Game of Life in Three Dimensions"
 * the range a-b is the number of neigbours required to keep a living cell alive
 * the range c-d is the number of neighbours required to make a new living cell
 */
export function transitionRuleFromBaysCoding(a: number, b: number, c: number, d: number): TotalisticTransitionRule {
    const nDimensions = 3;
    const nStates = 2;
    let singleStateTransitions = [
        {
            startState: 0,
            transitions: [
                {
                    endState: 1,
                    range: new Range(c, d)
                }
            ]
        }
    ];

    const deathTransitions = {
        startState: 1,
        transitions: []
    };

    const neigbourhood = Neigbourhood.makeForDistance1(nDimensions);

    // Add the 'death' transitions
    // there are potentially 3 deadzones: between 0 and the alive zone, between the alive zone and the reproduction zone
    // and between the reproduction zone and MAX
    if(a > 0) {
        deathTransitions.transitions.push({
            endState: 0,
            range: new Range(0, a-1)
        });
    }

    if(c - b > 1) {
        deathTransitions.transitions.push({
            endState: 0,
            range: new Range(b+1, c-1)
        });
    }

    if(d < (neigbourhood.getNumNeighbours())) {
        deathTransitions.transitions.push({
            endState: 0,
            range: new Range(d, neigbourhood.getNumNeighbours())
        });
    }

    singleStateTransitions.push(deathTransitions);

    return new TotalisticTransitionRule(nDimensions, neigbourhood, nStates, singleStateTransitions); 
}