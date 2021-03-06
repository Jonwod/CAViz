import { TotalisticTransitionRule } from "./transition_rule.js";
import { Neigbourhood } from "./transition_rule.js";
import { Range } from "./range.js";
export function transitionRuleFromBaysCoding(nDimensions, keepAlive, reproduce) {
    const nStates = 2;
    let singleStateTransitions = [
        {
            startState: 0,
            transitions: [
                {
                    endState: 1,
                    range: reproduce
                }
            ]
        }
    ];
    const deathTransitions = {
        startState: 1,
        transitions: []
    };
    const neigbourhood = Neigbourhood.makeForDistance1(nDimensions);
    if (keepAlive.getStart() > 0) {
        deathTransitions.transitions.push({
            endState: 0,
            range: new Range(0, keepAlive.getStart() - 1)
        });
    }
    if (keepAlive.getEnd() < (neigbourhood.getNumNeighbours())) {
        deathTransitions.transitions.push({
            endState: 0,
            range: new Range(keepAlive.getEnd() + 1, neigbourhood.getNumNeighbours())
        });
    }
    singleStateTransitions.push(deathTransitions);
    return new TotalisticTransitionRule(nDimensions, neigbourhood, nStates, singleStateTransitions);
}
