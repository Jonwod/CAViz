import { assert } from "../assert.js";

export class NumberInput {
    constructor(defaultValue: number, integer: boolean = false,
                onChange: (ni: NumberInput) => void = null, min: number=null, max: number=null) {
        if(min !== null  &&  max !== null) {
            assert(max >= min);
        }
        this.inputElem = document.createElement("input");
        this.inputElem.type = "number";
        if(min !== null) {
            this.inputElem.setAttribute("min", min.toString());
        }
        if(max !== null) {
            this.inputElem.setAttribute("max", max.toString());
        }
        let that = this;
        this.inputElem.addEventListener("change", (e) => {
            let input = e.target as HTMLInputElement;
            let newVal = integer ? parseInt(input.value) : parseFloat(input.value);
            if(integer && input.value.includes(".")) {
                newVal = NaN;
            }
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

    // Will return NaN if input is not a valid number
    public getValue(): number {
        return this.value;
    }

    /**
     * Returns false if input is not a valid number of the appropriate
     * type.
     */
    public isValid(): boolean {
        return !isNaN(this.value);
    }

    /**
     * Forces current value to that specified. onChange callback
     * will not be fired.
     * @param value New value
     */
    public setValue(value: number) {
        this.value = value;
        this.inputElem.value = value.toString();
    }

    private inputElem: HTMLInputElement;

    private value: number;
    // private onChange: (ni: NumberInput) => void;
}