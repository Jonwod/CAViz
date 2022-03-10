import { assert } from "../assert.js";
export class NumberInput {
    constructor(defaultValue, integer = false, onChange = null, min = null, max = null) {
        if (min !== null && max !== null) {
            assert(max >= min);
        }
        this.inputElem = document.createElement("input");
        this.inputElem.setAttribute("type", "number");
        if (min !== null) {
            this.inputElem.setAttribute("min", min.toString());
        }
        if (max !== null) {
            this.inputElem.setAttribute("max", max.toString());
        }
        let that = this;
        this.inputElem.addEventListener("change", (e) => {
            let input = e.target;
            const newVal = integer ? parseInt(input.value) : parseFloat(input.value);
            assert(newVal !== null && typeof (newVal) !== 'undefined');
            that.value = newVal;
            if (onChange) {
                onChange(that);
            }
        });
        this.inputElem.value = defaultValue.toString();
        this.value = defaultValue;
    }
    html() {
        return this.inputElem;
    }
    getValue() {
        return this.value;
    }
}
