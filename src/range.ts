/**
 * Represents an inclusive range
 */
export class Range {
    constructor(start: number, end: number) {
        if(start > end) {
            this.end = start;
            this.start = end;
        } else {
            this.start = start;
            this.end = end;
        }
    }

    public contains(x: number): boolean {
        return (x >= this.start)  &&  (x <= this.end);
    }

    public getStart(): number {
        return this.start;
    }

    public getEnd(): number {
        return this.end;
    }

    private start: number;
    private end: number;
}