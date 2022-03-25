import { Table } from "./table.js";
import { NumberDisplay } from "./number_display.js";
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
    update(transitionRule) {
        this.lambda.setValue(transitionRule.langtonLambdaParameter());
    }
    getHTML() {
        return this.html;
    }
}
