export abstract class State {
    abstract onEnter(): void;
    abstract onExit(): void;
}

export class StateMachine {
    constructor(initialState: State) {
        this.setState(initialState);
    }

    public setState(newState: State) {
        if(this.state) {
            this.state.onExit();
        }
        this.state = newState;
        this.state.onEnter();
    }

    private state: State;
}