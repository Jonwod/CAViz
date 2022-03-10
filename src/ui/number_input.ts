import { assert } from "../assert.js";

export class NumberInput {
    constructor(defaultValue: number, integer: boolean = false,
                onChange: (ni: NumberInput) => void = null, min: number=null, max: number=null) {
        if(min !== null  &&  max !== null) {
            assert(max >= min);
        }
        this.inputElem = document.createElement("input");
        this.inputElem.setAttribute("type", "number");
        if(min !== null) {
            this.inputElem.setAttribute("min", min.toString());
        }
        if(max !== null) {
            this.inputElem.setAttribute("max", max.toString());
        }
        let that = this;
        this.inputElem.addEventListener("change", (e) => {
            let input = e.target as HTMLInputElement;
            const newVal = integer ? parseInt(input.value) : parseFloat(input.value);
            // TODO: better validation and handling
            assert(newVal !== null && typeof(newVal) !== 'undefined');
            that.value = newVal;
            if(onChange) {
                onChange(that);
            }
        });
        this.inputElem.value = defaultValue.toString();
        this.value = defaultValue;
    }

    public getHTML(): HTMLElement {
        return this.inputElem;
    }

    public getValue(): number {
        return this.value;
    }

    private inputElem: HTMLInputElement;

    private value: number;
    // private onChange: (ni: NumberInput) => void;
}