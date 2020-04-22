const levels =
    [
        // LEVEL 1
        {
            dimension: { rows: 21, cols: 150 },
            gameCharacterCoords: [[11, 7], [11, 6], [11, 5], [11, 4], [11, 3], [11, 2], [11, 1], [11, 0]],
            gameCharacterDirection: "right",
            objects: [
                { type: "wallBrick", bluePrint: "10.0.H8.COCO", colorMode: "brick" },
                { type: "wallBrick", bluePrint: "12.1.H5.COCC", colorMode: "brick" },
                { type: "wallBrick", bluePrint: "10.8.H1.CCOO", colorMode: "brick" },
                { type: "wallBrick", bluePrint: "11.8.H1.OCCC", colorMode: "brick" },
                { type: "wallBrick", bluePrint: "12.6.H1.CCOO", colorMode: "brick" },
                { type: "wallBrick", bluePrint: "13.6.V1.OCOC", colorMode: "brick" },
                { type: "wallBrick", bluePrint: "14.6.V6.OCCC", colorMode: "brick" },
                { type: "wallBrick", bluePrint: "13.8.V8.CCOC", colorMode: "brick" },
                { type: "wallBrick", bluePrint: "8.10.V11.OCCC", colorMode: "brick" },
                { type: "wallBrick", bluePrint: "7.10.H1.CCOO", colorMode: "brick" },
                { type: "wallBrick", bluePrint: "7.1.H9.COCC", colorMode: "brick" },
                { type: "coin", row: 20, col: 0 },
                { type: "coin", row: 13, col: 7 },
                { type: "coin", row: 14, col: 7 },
                { type: "coin", row: 15, col: 7 },
                { type: "coin", row: 16, col: 7 },
                { type: "coin", row: 17, col: 7 },
                { type: "electro", row: 19, col: 10, direction: "down", openCloseInterval: [1000, 1000] },
                { type: "electro", row: 2, col: 2, direction: "up", openCloseInterval: [500, 500] },
                { type: "electro", row: 3, col: 1, direction: "left", openCloseInterval: [1500, 2500] },
                { type: "electro", row: 3, col: 3, direction: "right", openCloseInterval: [1500, 2000] },
                { type: "electro", row: 4, col: 2, direction: "down", openCloseInterval: [500, 200] },
            ],
            npcs: [
                { type: "bug", row: 17, col: 3 }, // not ready yet
            ]
        },
        // LEVEL 2
    ];