import { Renderer } from "../dist/renderer.js";
import { CellularAutomaton } from "./cellular_automaton.js";
import { TotalisticTransitionRule, Neigbourhood } from "./transition_rule.js";
import { Range } from "./range.js";
import { Configuration } from "./configuration.js";
const nStates = 2;
const nDimensions = 3;
const neighbourhood = Neigbourhood.makeForDistance1(nDimensions);
console.log(neighbourhood.getOffsets());
const transitionRule = new TotalisticTransitionRule(nDimensions, neighbourhood, nStates, [
    {
        startState: 0,
        transitions: [
            {
                endState: 1,
                range: new Range(6, 6)
            }
        ]
    },
    {
        startState: 1,
        transitions: [
            {
                endState: 0,
                range: new Range(0, 4)
            },
            {
                endState: 0,
                range: new Range(6, 26)
            }
        ]
    }
]);
let testCA = new CellularAutomaton(nStates, nDimensions, transitionRule);
let config = Configuration.makeRandom(3, 10, 2);
console.log("updating");
let body = document.getElementsByTagName("body")[0];
let renderer = new Renderer(500, 400);
body.appendChild(renderer.getHTML());
const updateRate = 60.0;
let lastUpdate;
function draw(timestamp) {
    if (lastUpdate === undefined)
        lastUpdate = timestamp;
    const elapsed = timestamp - lastUpdate;
    if ((elapsed / 1000.0) >= (1.0 / updateRate)) {
        renderer.render(config);
        lastUpdate = timestamp;
    }
    window.requestAnimationFrame(draw);
}
window.requestAnimationFrame(draw);
