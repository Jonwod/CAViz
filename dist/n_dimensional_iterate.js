export function nDimensionalIterate(dimensions, callback) {
    let vector = [];
    for (let d = 0; d < dimensions.length; ++d) {
        vector.push(dimensions[d].getStart());
    }
    let done = false;
    while (!done) {
        const dEnd = dimensions.length - 1;
        while (vector[dEnd] <= dimensions[dEnd].getEnd()) {
            callback(vector);
            ++vector[dEnd];
        }
        vector[dEnd] = dimensions[dEnd].getStart();
        let carry = 1;
        for (let d = dEnd - 1; d >= 0 && carry > 0; --d) {
            if (vector[d] === dimensions[d].getEnd()) {
                vector[d] = dimensions[d].getStart();
            }
            else {
                ++vector[d];
                carry = 0;
            }
        }
        if (carry === 1) {
            done = true;
        }
    }
}
