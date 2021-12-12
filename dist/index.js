import { CellularAutomaton } from "./cellular_automaton.js";
import { Range } from "./range.js";
import { Configuration } from "./configuration.js";
import { transitionRuleFromBaysCoding } from "./bays_coding.js";
import { createSimulation } from "./ca_simulation.js";
const nStates = 2;
const nDimensions = 3;
const transitionRule = transitionRuleFromBaysCoding(nDimensions, new Range(4, 5), new Range(2, 6));
let testCA = new CellularAutomaton(nStates, nDimensions, transitionRule);
let config = Configuration.makeRandom(3, 10, 2, 0.34);
let sim;
{
    const transitionRule = transitionRuleFromBaysCoding(2, new Range(2, 3), new Range(3, 3));
    let life2d = new CellularAutomaton(2, 2, transitionRule);
    let initConfig = Configuration.makeRandom(2, 512, 2, 0.4);
    sim = createSimulation(life2d, initConfig);
}
let body = document.getElementsByTagName("body")[0];
body.appendChild(sim.getHTML());
sim.run();
