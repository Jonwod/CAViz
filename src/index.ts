import { Renderer } from "../dist/renderer.js";
import {CellularAutomaton} from "./cellular_automaton.js";
import { TransitionRule, TotalisticTransitionRule, Neigbourhood } from "./transition_rule.js";
import { Range } from "./range.js";
import { Configuration } from "./configuration.js";
import {nDimensionalIterate} from "./n_dimensional_iterate.js";
import { transitionRuleFromBaysCoding } from "./bays_coding.js";
import { createSimulation, CASimulation } from "./ca_simulation.js";

// ====== Constructing a test CA  ======
// Bays' (5766) rule:
const nStates = 2;
const nDimensions = 3;

const transitionRule = transitionRuleFromBaysCoding( nDimensions, new Range(4,5), new Range(2,6));

let testCA = new CellularAutomaton(nStates, nDimensions, transitionRule);
let config = Configuration.makeRandom(3, 10, 2, 0.34);

// config.print1D();
// config.print1D();
// NEXT STEP: apply update to configuration
// Then: rendering
// ====================================


// 2222222222 2d Game of Life 222222222222
let sim: CASimulation;
{
    const transitionRule = transitionRuleFromBaysCoding(2, new Range(2,3), new Range(3,3));
    let life2d = new CellularAutomaton(2, 2, transitionRule);
    let initConfig = Configuration.makeRandom(2, 1024, 2, 0.4);
    sim = createSimulation(life2d, initConfig);
}
// 222222222222222222222222222222222222222

let body = <HTMLBodyElement>document.getElementsByTagName("body")[0];
body.appendChild(sim.getHTML());
sim.run();

// let renderer = new Renderer(500, 400);
// body.appendChild(renderer.getHTML());

// // hz
// const drawRate = 60.0;
// const caUpdateRate = 5.0;
// let lastDrawStamp, lastCaUpdateStamp;

// function draw(timestamp) {
//     if (lastDrawStamp === undefined)
//         lastDrawStamp = timestamp;
//     if(lastCaUpdateStamp === undefined)
//         lastCaUpdateStamp = timestamp;
//     const timeSinceDraw = timestamp - lastDrawStamp;

//     if ( (timeSinceDraw/1000.0) >= (1.0/drawRate) ) {        
//         // Do the rendering here
//         renderer.render(config);
//         lastDrawStamp = timestamp;
//     }

//     const timeSinceCaUpdate = timestamp - lastCaUpdateStamp;
//     if( (timeSinceCaUpdate/1000.0) >= (1.0/caUpdateRate) ) {
//         config.update(transitionRule);
//         lastCaUpdateStamp = timestamp;
//     }

//     window.requestAnimationFrame(draw);
// }

// window.requestAnimationFrame(draw);
