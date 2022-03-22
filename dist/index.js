import { Renderer } from "./renderer.js";
import { CellularAutomaton } from "./cellular_automaton.js";
import { Range } from "./range.js";
import { Configuration } from "./configuration.js";
import { transitionRuleFromBaysCoding } from "./bays_coding.js";
import { CASimulation } from "./ca_simulation.js";
import { State, StateMachine } from "./generic/state_machine.js";
import { NumberInput } from "./ui/number_input.js";
import { runAllTests } from "./test.js";
import { CAGreatestHits } from "./ui/ca_greatest_hits.js";
import { assert } from "./assert.js";
let appStateMachine;
runAllTests();
class ConstructionState extends State {
    constructor() {
        super(...arguments);
        this.ui = {
            stayAliveInputLow: null,
            stayAliveInputHigh: null,
            reproduceInputLow: null,
            reproduceInputHigh: null,
            worldSizeInput: null,
            popDensityInput: null
        };
    }
    onEnter() {
        let div = document.createElement("div");
        let horizontalDiv1 = document.createElement("div");
        horizontalDiv1.style.display = 'flex';
        horizontalDiv1.style.flexDirection = 'row';
        horizontalDiv1.style.justifyContent = 'space-evenly';
        horizontalDiv1.style.alignItems = 'center';
        horizontalDiv1.appendChild(div);
        let gl = document.createElement("canvas").getContext("webgl");
        this.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
        let that = this;
        let button2d = document.createElement("input");
        let button3d = document.createElement("input");
        {
            let dimensionalityDiv = document.createElement("div");
            button2d.setAttribute("type", "radio");
            button2d.setAttribute("name", "dim");
            button2d.value = "2d";
            button2d.id = "radio2d";
            dimensionalityDiv.appendChild(button2d);
            let label2d = document.createElement("label");
            label2d.innerHTML = "2D";
            label2d.setAttribute("for", button2d.id);
            dimensionalityDiv.appendChild(label2d);
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
                that.revalidate();
            });
            button3d.addEventListener("change", (event) => {
                that.dimensions = 3;
                that.revalidate();
            });
            button3d.checked = true;
            this.dimensions = 3;
            div.appendChild(dimensionalityDiv);
        }
        this.ui.stayAliveInputLow = new NumberInput(2, true, () => { that.revalidate(); }, 0);
        this.ui.stayAliveInputHigh = new NumberInput(3, true, () => { that.revalidate(); }, 0);
        this.ui.reproduceInputLow = new NumberInput(3, true, () => { that.revalidate(); }, 0);
        this.ui.reproduceInputHigh = new NumberInput(3, true, () => { that.revalidate(); }, 0);
        {
            let totalisticParamsDiv = document.createElement("div");
            let aliveRangeLable = document.createElement("p");
            aliveRangeLable.innerHTML = "<b>Stay-alive range</b>";
            totalisticParamsDiv.appendChild(aliveRangeLable);
            let aliveRangeExpl = document.createElement("p");
            aliveRangeExpl.innerHTML = "(Live cell will remain alive when the number of live neighbours falls in this range)";
            totalisticParamsDiv.appendChild(aliveRangeExpl);
            totalisticParamsDiv.appendChild(this.ui.stayAliveInputLow.getHTML());
            totalisticParamsDiv.appendChild(this.ui.stayAliveInputHigh.getHTML());
            let reproduceRangeLabel = document.createElement("p");
            reproduceRangeLabel.innerHTML = "<b>Reproduce range</b>";
            totalisticParamsDiv.appendChild(reproduceRangeLabel);
            let reproduceRangeExpl = document.createElement("p");
            reproduceRangeExpl.innerHTML = "(Dead cell becomes alive when the number of live neighbours falls in this range)";
            totalisticParamsDiv.appendChild(reproduceRangeExpl);
            totalisticParamsDiv.appendChild(this.ui.reproduceInputLow.getHTML());
            totalisticParamsDiv.appendChild(this.ui.reproduceInputHigh.getHTML());
            div.appendChild(totalisticParamsDiv);
        }
        this.ui.worldSizeInput = new NumberInput(100, true, () => { that.revalidate(); }, 0);
        this.ui.popDensityInput = new NumberInput(0.34, false, () => { that.revalidate(); }, 0, 1);
        {
            let configDiv = document.createElement("div");
            let worldSizeLabel = document.createElement("p");
            worldSizeLabel.innerHTML = "<b>World size:</b>";
            configDiv.appendChild(worldSizeLabel);
            configDiv.appendChild(this.ui.worldSizeInput.getHTML());
            let popDensityLabel = document.createElement("p");
            popDensityLabel.innerHTML = "<b>Initial population density:</b>";
            configDiv.appendChild(popDensityLabel);
            configDiv.appendChild(this.ui.popDensityInput.getHTML());
            div.appendChild(configDiv);
        }
        this.confirmButton = document.createElement("button");
        this.confirmButton.innerText = "Simulate";
        this.confirmButton.addEventListener("click", () => {
            const numStates = 2;
            let transitionRule = that.makeTransitionRule();
            let ca = new CellularAutomaton(numStates, that.dimensions, transitionRule);
            let conf = Configuration.makeRandom(that.dimensions, this.ui.worldSizeInput.getValue(), numStates, this.ui.popDensityInput.getValue());
            appStateMachine.setState(new SimState(ca, conf));
        });
        div.appendChild(this.confirmButton);
        this.errorBox = document.createElement('div');
        div.appendChild(this.errorBox);
        let CAGH = new CAGreatestHits();
        CAGH.bindToOnSelected((name, ca) => {
            that.ui.stayAliveInputLow.setValue(ca.stayAlive.getStart());
            that.ui.stayAliveInputHigh.setValue(ca.stayAlive.getEnd());
            that.ui.reproduceInputLow.setValue(ca.reproduce.getStart());
            that.ui.reproduceInputHigh.setValue(ca.reproduce.getEnd());
            if (ca.dimensions === 2) {
                button2d.checked = true;
                button3d.checked = false;
                that.dimensions = 2;
            }
            else if (ca.dimensions === 3) {
                button2d.checked = false;
                button3d.checked = true;
                that.dimensions = 3;
            }
            else {
                assert(false, "Only 2 or 3 dimensions supported");
            }
            that.revalidate();
        });
        horizontalDiv1.appendChild(CAGH.getHTML());
        this.myHTML = horizontalDiv1;
        document.getElementsByTagName("body")[0].appendChild(this.myHTML);
        this.revalidate();
    }
    makeTransitionRule() {
        return transitionRuleFromBaysCoding(this.dimensions, new Range(this.ui.stayAliveInputLow.getValue(), this.ui.stayAliveInputHigh.getValue()), new Range(this.ui.reproduceInputLow.getValue(), this.ui.reproduceInputHigh.getValue()));
    }
    revalidate() {
        this.prospectiveTransitionRule = this.makeTransitionRule();
        let errorStrings = this.getInputErrors();
        if (errorStrings.length > 0) {
            this.confirmButton.disabled = true;
        }
        else {
            this.confirmButton.disabled = false;
            console.log("lambda: " + this.prospectiveTransitionRule.langtonLambdaParameter());
        }
        while (this.errorBox.firstChild) {
            this.errorBox.removeChild(this.errorBox.lastChild);
        }
        let errorList = document.createElement("ul");
        errorStrings.forEach(s => {
            let e = document.createElement('li');
            e.classList.add("errorText");
            e.innerHTML = s;
            e.style.color = 'red';
            errorList.appendChild(e);
        });
        this.errorBox.appendChild(errorList);
    }
    getInputErrors() {
        let errors = [];
        let nNeighbours = this.prospectiveTransitionRule.getNeigbourhood().getNumNeighbours();
        if (this.ui.stayAliveInputLow.getValue() < 0) {
            errors.push("The start of the stay alive range cannot be negative");
        }
        if (!this.ui.stayAliveInputLow.isValid()) {
            errors.push("Start of stay alive range must be an integer");
        }
        if (this.ui.stayAliveInputLow.getValue() > this.ui.stayAliveInputHigh.getValue()) {
            errors.push("The start of the stay alive range must be less than or equal to the end");
        }
        if (this.ui.stayAliveInputLow.getValue() < 0) {
            errors.push("The start of the reproduce range cannot be negative");
        }
        if (this.ui.stayAliveInputHigh.getValue() > nNeighbours) {
            errors.push("The end of the stay alive range cannot be greater than " +
                nNeighbours + " as this is the maximum possible number of live neighbours");
        }
        if (!this.ui.stayAliveInputHigh.isValid()) {
            errors.push("End of stay alive range must be an integer");
        }
        if (this.ui.reproduceInputLow.getValue() > this.ui.reproduceInputHigh.getValue()) {
            errors.push("The start of the reproduce range must be less than or equal to the end");
        }
        if (!this.ui.reproduceInputLow.isValid()) {
            errors.push("Start of reproduce range must be an integer");
        }
        if (this.ui.reproduceInputHigh.getValue() > nNeighbours) {
            errors.push("The end of the reproduce range cannot be greater than " +
                nNeighbours + " as this is the maximum possible number of live neighbours.");
        }
        if (!this.ui.reproduceInputHigh.isValid()) {
            errors.push("End of reproduce range must be an integer");
        }
        if (!this.ui.popDensityInput.isValid()) {
            errors.push("Population density must be a number in the range 0-1");
        }
        const pd = this.ui.popDensityInput.getValue();
        if (pd < 0 || pd > 1) {
            errors.push("Population density must be in the range 0-1");
        }
        if (!this.ui.worldSizeInput.isValid()) {
            errors.push("World size must be an integer");
        }
        const maxCells = Math.pow(this.maxTextureSize, 2);
        const maxWorldSize = Math.floor(Math.pow(maxCells, 1 / this.dimensions));
        if (this.ui.worldSizeInput.getValue() > maxWorldSize) {
            errors.push("World size too large. Max supported world size for a "
                + this.dimensions + "D world is " + maxWorldSize + " on your system.");
        }
        return errors;
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
        this.sim = new CASimulation(this.ca, this.initConfig, 1000, 1000);
        let div = document.createElement("div");
        let topdiv = document.getElementById("topdiv");
        this.myHTML = div;
        div.appendChild(this.sim.getHTML());
        let constructionButton = document.createElement("button");
        constructionButton.innerText = "New CA";
        constructionButton.addEventListener("click", () => {
            appStateMachine.setState(new ConstructionState());
        });
        topdiv.appendChild(constructionButton);
        document.getElementsByTagName("body")[0].appendChild(this.myHTML);
        this.sim.run();
        this.newCAButton = constructionButton;
    }
    onExit() {
        this.myHTML.remove();
        this.newCAButton.remove();
        this.sim.terminate();
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
