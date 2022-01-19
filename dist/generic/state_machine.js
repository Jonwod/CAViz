export class State {
}
export class StateMachine {
    constructor(initialState) {
        this.setState(initialState);
    }
    setState(newState) {
        if (this.state) {
            this.state.onExit();
        }
        this.state = newState;
        this.state.onEnter();
    }
}
