import { Renderer } from "./renderer.js";
import {CellularAutomaton} from "./cellular_automaton.js";
import { TransitionRule, TotalisticTransitionRule, Neigbourhood } from "./transition_rule.js";
import { Range } from "./range.js";
import { Configuration } from "./configuration.js";
import {nDimensionalIterate} from "./n_dimensional_iterate.js";
import { transitionRuleFromBaysCoding } from "./bays_coding.js";
import { createSimulation, CASimulation } from "./ca_simulation.js";
import { State, StateMachine } from "./generic/state_machine.js";

let appStateMachine: StateMachine;

class ConstructionState extends State {
    onEnter(): void {
        let div = document.createElement("div");
        let button = document.createElement("button");
        button.innerHTML = "2D Cellular Automaton";
        button.addEventListener("click", () => {
            appStateMachine.setState(new SimState(false));
        });
        div.appendChild(button);
        let button2 = document.createElement("button");
        button2.addEventListener("click", () => {
            appStateMachine.setState(new SimState(true));
        });
        button2.innerHTML = "3D Cellular Automaton";
        div.appendChild(button2);
        this.myHTML = div;
        document.getElementsByTagName("body")[0].appendChild(this.myHTML);
    }
    onExit(): void {
        this.myHTML.remove();
    }

    private myHTML: HTMLElement;
}

class SimState extends State {
    constructor(threeD: boolean) {
        super();
        this.threeD = threeD;
    }
    onEnter(): void {
        let sim: CASimulation;
        if(this.threeD) {
            // Bays' (5766) rule:
            const nStates = 2;
            const nDimensions = 3;

            const transitionRule = transitionRuleFromBaysCoding( nDimensions, new Range(4,5), new Range(2,6));

            let testCA = new CellularAutomaton(nStates, nDimensions, transitionRule);
            let config = Configuration.makeRandom(3, 10, 2, 0.34);
            sim = createSimulation(testCA, config);
        } else {
            const transitionRule = transitionRuleFromBaysCoding(2, new Range(2,3), new Range(3,3));
            let life2d = new CellularAutomaton(2, 2, transitionRule);
            let initConfig = Configuration.makeRandom(2, 512, 2, 0.4);
            sim = createSimulation(life2d, initConfig);
        }

        let div = document.createElement("div");
        this.myHTML = div; 
        div.appendChild(sim.getHTML());
        let constructionButton = document.createElement("button");
        constructionButton.innerText = "New CA";
        constructionButton.addEventListener("click", () => {
            appStateMachine.setState(new ConstructionState());
        });
        div.appendChild(constructionButton);
        document.getElementsByTagName("body")[0].appendChild(this.myHTML);
        sim.run();
    }

    onExit(): void {
        this.myHTML.remove();
    }

    private myHTML: HTMLElement;
    private threeD: boolean;
}

appStateMachine = new StateMachine(new SimState(false));

// ====== Constructing a test CA  ======


// config.print1D();
// config.print1D();
// NEXT STEP: apply update to configuration
// Then: rendering
// ====================================



export function newCA() {

}

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
