import { Table } from "./table.js";
import { NumberDisplay } from "./number_display.js";
import { TransitionRule } from "../transition_rule.js";

/**
 * A UI element that provides feedback on likely behaviour of
 * a cellular automaton. 
 */
export class ConstructionFeedbackPanel {
    constructor() {
        let div = document.createElement("div");
        this.html = div;
        let heading = document.createElement("h2");
        heading.innerHTML = "Current CA Info";

        div.appendChild(heading);
        let table = new Table(2);

        let label = document.createElement("p");
        label.innerHTML = "Langton's λ Parameter: ";
        let lambda = new NumberDisplay(3);
        this.lambda = lambda;
        table.addRow([label, lambda.getHTML()]);

        div.appendChild(table.getHTML());
    }

    /**
     * Updates feedback based on prospective CA.
     * @param transitionRule Transition rule for prospective CA
     */
    public update(transitionRule: TransitionRule) {
        this.lambda.setValue(transitionRule.langtonLambdaParameter());
    }

    public getHTML(): HTMLElement {
        return this.html;
    }

    private html: HTMLElement;
    private lambda: NumberDisplay;
}