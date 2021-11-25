import { Renderer } from "../dist/renderer.js";
import {CellularAutomaton} from "./cellular_automaton.js";
import { TransitionRule, TotalisticTransitionRule, Neigbourhood } from "./transition_rule.js";
import { Range } from "./range.js";
import { Configuration } from "./configuration.js";
import {nDimensionalIterate} from "./n_dimensional_iterate.js";
import { transitionRuleFromBaysCoding } from "./bays_coding.js";

// ====== Constructing a test CA  ======
// Bays' (5766) rule:
const nStates = 2;
const nDimensions = 3;

const transitionRule = transitionRuleFromBaysCoding(4,5,2,6);

let testCA = new CellularAutomaton(nStates, nDimensions, transitionRule);
let config = Configuration.makeRandom(3, 10, 2, 0.34);

// config.print1D();
// config.print1D();
// NEXT STEP: apply update to configuration
// Then: rendering
// ====================================


let body = <HTMLBodyElement>document.getElementsByTagName("body")[0];
let renderer = new Renderer(500, 400);
body.appendChild(renderer.getHTML());

// hz
const drawRate = 60.0;
const caUpdateRate = 5.0;
let lastDrawStamp, lastCaUpdateStamp;

function draw(timestamp) {
    if (lastDrawStamp === undefined)
        lastDrawStamp = timestamp;
    if(lastCaUpdateStamp === undefined)
        lastCaUpdateStamp = timestamp;
    const timeSinceDraw = timestamp - lastDrawStamp;

    if ( (timeSinceDraw/1000.0) >= (1.0/drawRate) ) {        
        // Do the rendering here
        renderer.render(config);
        lastDrawStamp = timestamp;
    }

    const timeSinceCaUpdate = timestamp - lastCaUpdateStamp;
    if( (timeSinceCaUpdate/1000.0) >= (1.0/caUpdateRate) ) {
        config.update(transitionRule);
        lastCaUpdateStamp = timestamp;
    }

    window.requestAnimationFrame(draw);
}

window.requestAnimationFrame(draw);
