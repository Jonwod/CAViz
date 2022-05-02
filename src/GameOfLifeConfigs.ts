import { Configuration } from "./configuration.js";


export function makeBasicGliderConfig(worldSize: number): Configuration {
    let basicGlider = new Configuration(2, worldSize, 2);
    basicGlider.set([12, 30], 1);
    basicGlider.set([11, 30], 1);
    basicGlider.set([10, 30], 1);
    basicGlider.set([10, 29],  1);
    basicGlider.set([11, 28],  1);

    return basicGlider;
}