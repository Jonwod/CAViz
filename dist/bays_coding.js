import { TotalisticTransitionRule } from "./transition_rule.js";
import { Neigbourhood } from "./transition_rule.js";
import { Range } from "./range.js";
export function transitionRuleFromBaysCoding(a, b, c, d) {
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
    if (a > 0) {
        deathTransitions.transitions.push({
            endState: 0,
            range: new Range(0, a - 1)
        });
    }
    if (c - b > 1) {
        deathTransitions.transitions.push({
            endState: 0,
            range: new Range(b + 1, c - 1)
        });
    }
    if (d < (neigbourhood.getNumNeighbours())) {
        deathTransitions.transitions.push({
            endState: 0,
            range: new Range(d, neigbourhood.getNumNeighbours())
        });
    }
    singleStateTransitions.push(deathTransitions);
    return new TotalisticTransitionRule(nDimensions, neigbourhood, nStates, singleStateTransitions);
}
