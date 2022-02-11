import { Renderer } from "./renderer.js";
import { CellularAutomaton } from "./cellular_automaton.js";
import { Range } from "./range.js";
import { Configuration } from "./configuration.js";
import { transitionRuleFromBaysCoding } from "./bays_coding.js";
import { CASimulation } from "./ca_simulation.js";
import { State, StateMachine } from "./generic/state_machine.js";
import { NumberInput } from "./ui/number_input.js";
let appStateMachine;
class ConstructionState extends State {
    onEnter() {
        let div = document.createElement("div");
        let that = this;
        {
            let dimensionalityDiv = document.createElement("div");
            let button2d = document.createElement("input");
            button2d.setAttribute("type", "radio");
            button2d.setAttribute("name", "dim");
            button2d.value = "2d";
            button2d.id = "radio2d";
            dimensionalityDiv.appendChild(button2d);
            let label2d = document.createElement("label");
            label2d.innerHTML = "2D";
            label2d.setAttribute("for", button2d.id);
            dimensionalityDiv.appendChild(label2d);
            let button3d = document.createElement("input");
            button3d.setAttribute("type", "radio");
            button3d.setAttribute("name", "dim");
            button3d.value = "3d";
            dimensionalityDiv.appendChild(button3d);
            let label3d = document.createElement("label");
            label3d.innerHTML = "3D";
            label3d.setAttribute("for", button3d.id);
            dimensionalityDiv.appendChild(label3d);
            button2d.addEventListener("change", (event) => {
                that.dimensions = 2;
                console.log('2');
            });
            button3d.addEventListener("change", (event) => {
                that.dimensions = 3;
                console.log('3');
            });
            button3d.checked = true;
            this.dimensions = 3;
            div.appendChild(dimensionalityDiv);
        }
        let stayAliveInputLow = new NumberInput(2, true, 0);
        let stayAliveInputHigh = new NumberInput(3, true, 0);
        let reproduceInputLow = new NumberInput(3, true, 0);
        let reproduceInputHigh = new NumberInput(3, true, 0);
        {
            let totalisticParamsDiv = document.createElement("div");
            let aliveRangeLable = document.createElement("p");
            aliveRangeLable.innerHTML = "<b>Stay-alive range</b>";
            totalisticParamsDiv.appendChild(aliveRangeLable);
            let aliveRangeExpl = document.createElement("p");
            aliveRangeExpl.innerHTML = "(Live cell will remain alive when the number of live neighbours falls in this range)";
            totalisticParamsDiv.appendChild(aliveRangeExpl);
            totalisticParamsDiv.appendChild(stayAliveInputLow.html());
            totalisticParamsDiv.appendChild(stayAliveInputHigh.html());
            let reproduceRangeLabel = document.createElement("p");
            reproduceRangeLabel.innerHTML = "<b>Reproduce range</b>";
            totalisticParamsDiv.appendChild(reproduceRangeLabel);
            let reproduceRangeExpl = document.createElement("p");
            reproduceRangeExpl.innerHTML = "(Dead cell becomes alive when the number of live neighbours falls in this range)";
            totalisticParamsDiv.appendChild(reproduceRangeExpl);
            totalisticParamsDiv.appendChild(reproduceInputLow.html());
            totalisticParamsDiv.appendChild(reproduceInputHigh.html());
            div.appendChild(totalisticParamsDiv);
        }
        let worldSizeInput = new NumberInput(100, true, 0);
        let popDensityInput = new NumberInput(0.34, false, 0, 1);
        {
            let configDiv = document.createElement("div");
            let worldSizeLabel = document.createElement("p");
            worldSizeLabel.innerHTML = "<b>World size:</b>";
            configDiv.appendChild(worldSizeLabel);
            configDiv.appendChild(worldSizeInput.html());
            let popDensityLabel = document.createElement("p");
            popDensityLabel.innerHTML = "<b>Initial population density:</b>";
            configDiv.appendChild(popDensityLabel);
            configDiv.appendChild(popDensityInput.html());
            div.appendChild(configDiv);
        }
        let confirmButton = document.createElement("button");
        confirmButton.innerText = "Simulate";
        confirmButton.addEventListener("click", () => {
            const numStates = 2;
            let transitionRule = transitionRuleFromBaysCoding(that.dimensions, new Range(stayAliveInputLow.getValue(), stayAliveInputHigh.getValue()), new Range(reproduceInputLow.getValue(), reproduceInputHigh.getValue()));
            let ca = new CellularAutomaton(numStates, that.dimensions, transitionRule);
            let conf = Configuration.makeRandom(that.dimensions, worldSizeInput.getValue(), numStates, popDensityInput.getValue());
            appStateMachine.setState(new SimState(ca, conf));
        });
        div.appendChild(confirmButton);
        this.myHTML = div;
        document.getElementsByTagName("body")[0].appendChild(this.myHTML);
    }
    onExit() {
        this.myHTML.remove();
    }
}
class SimState extends State {
    constructor(ca, initConfig) {
        super();
        this.ca = ca;
        this.initConfig = initConfig;
    }
    onEnter() {
        let sim = new CASimulation(this.ca, this.initConfig, 1000, 1000);
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
appStateMachine = new StateMachine(new ConstructionState());
