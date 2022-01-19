import { CASimulation2D } from "./ca_simulation2d.js";
import { CASimulation3D } from "./ca_simulation_3d.js";
import { assert } from "./assert.js";
export function createSimulation(ca, initialConfiguration) {
    if (ca.getNumDimensions() === 2) {
        return new CASimulation2D(ca, initialConfiguration);
    }
    else if (ca.getNumDimensions() === 3) {
        return new CASimulation3D(ca, initialConfiguration);
    }
    else {
        assert(false, "TODO: Implement for dimension" + ca.getNumDimensions());
    }
}
