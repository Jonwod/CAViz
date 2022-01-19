import { Renderer } from "./renderer.js";
import { CellularAutomaton } from "./cellular_automaton.js";
import { Range } from "./range.js";
import { Configuration } from "./configuration.js";
import { transitionRuleFromBaysCoding } from "./bays_coding.js";
import { createSimulation } from "./create_simulation.js";
import { State, StateMachine } from "./generic/state_machine.js";
let appStateMachine;
class ConstructionState extends State {
    onEnter() {
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
    onExit() {
        this.myHTML.remove();
    }
}
class SimState extends State {
    constructor(threeD) {
        super();
        this.threeD = threeD;
    }
    onEnter() {
        let sim;
        if (this.threeD) {
            const nStates = 2;
            const nDimensions = 3;
            const transitionRule = transitionRuleFromBaysCoding(nDimensions, new Range(4, 5), new Range(2, 6));
            let testCA = new CellularAutomaton(nStates, nDimensions, transitionRule);
            let config = Configuration.makeRandom(3, 100, 2, 0.34);
            sim = createSimulation(testCA, config);
        }
        else {
            const transitionRule = transitionRuleFromBaysCoding(2, new Range(2, 3), new Range(3, 3));
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
    onExit() {
        this.myHTML.remove();
    }
}
class TestInstancedRender extends State {
    onEnter() {
        let renderer = new Renderer(800, 800);
        document.getElementsByTagName("body")[0].appendChild(renderer.getHTML());
        let config = Configuration.makeRandom(3, 10, 2, 0.3);
        function tick(timestamp) {
            renderer.render(config);
            window.requestAnimationFrame(tick);
        }
        window.requestAnimationFrame(tick);
    }
    onExit() {
    }
}
appStateMachine = new StateMachine(new SimState(true));
