/**
 * This file contains glsl functions in string form,
 * such that they can be 
 */

export const myMod: string = 
`
int myMod(int a, int b) {
    return a - b * int(a / b);
}
`;

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// These functions all relate to conversion between
// coordinates of different dimensionality.

export const to3DCoords: string = 
`
ivec3 to3DCoords(int i) {
    int planeSize = uWorldSize * uWorldSize;
    int plane = i / planeSize;
    int planeRemainder = myMod(i, planeSize);
    int row = planeRemainder / uWorldSize;
    int rowRemainder = myMod(planeRemainder, uWorldSize);
    return ivec3(plane, row, rowRemainder);
}
`;


export const toIndex =
`
int toIndex(ivec3 coords) {
    return coords.x * uWorldSize * uWorldSize + coords.y * uWorldSize + coords.z;
}
`;

export const toTextureCoords =
`
ivec2 toTextureCoords(int index) {
    int row = index / textureSize(uReadBuffer, 0).x;
    int rowRemainder = myMod(index, textureSize(uReadBuffer, 0).x);
    return ivec2(row, rowRemainder);
}
`;


export const toTextureCoords_ivec3 = 
`
ivec2 toTextureCoords(ivec3 worldCoords) {
    int index = toIndex(worldCoords);
    return toTextureCoords(index);
}
`;

export const allCoordConvertFuncs = to3DCoords + toIndex + toTextureCoords + toTextureCoords_ivec3;

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
