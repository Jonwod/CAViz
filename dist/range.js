export class Range {
    constructor(start, end) {
        if (start > end) {
            this.end = start;
            this.start = end;
        }
        else {
            this.start = start;
            this.end = end;
        }
    }
    contains(x) {
        return (x >= this.start) && (x <= this.end);
    }
    getStart() {
        return this.start;
    }
    getEnd() {
        return this.end;
    }
}
