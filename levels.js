const levels =
    [
        // LEVEL 1
        {
            dimension: { rows: 21, cols: 100 },
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
                { type: "wallBrick", bluePrint: "9.10.V10.OCCC", colorMode: "brick" },
                { type: "wallBrick", bluePrint: "8.10.H1.CCOO", colorMode: "brick" },
                { type: "wallBrick", bluePrint: "8.2.H8.COCC", colorMode: "brick" },
                { type: "coin", row: 20, col: 0 },
                { type: "coin", row: 14, col: 7 },
                { type: "coin", row: 15, col: 7 },
                { type: "coin", row: 16, col: 7 },
                { type: "coin", row: 17, col: 7 },
                { type: "coin", row: 18, col: 7 },
                { type: "coin", row: 9, col: 7 },
                { type: "coin", row: 9, col: 5 },
                { type: "coin", row: 9, col: 3 },
                { type: "coin", row: 11, col: 9 },
                { type: "coin", row: 13, col: 9 },
                { type: "coin", row: 15, col: 9 },
                { type: "coin", row: 17, col: 9 },
                { type: "electro", row: 19, col: 10, direction: "down", openCloseInterval: [1000, 1000] },
                { type: "electro", row: 8, col: 1, direction: "left", openCloseInterval: [1000, 1500] },
                { type: "wallBrick", bluePrint: "1.1.H1.COOC", colorMode: "blue" },
                { type: "wallBrick", bluePrint: "1.2.H1.CCCO", colorMode: "blue" },
                { type: "wallBrick", bluePrint: "2.1.H1.OCCC", colorMode: "blue" },
                { type: "coin", row: 2, col: 2 },
                { type: "wallBrick", bluePrint: "0.15.V9.OCOC", colorMode: "light" },
                { type: "wallBrick", bluePrint: "9.15.V1.OOCC", colorMode: "light" },
                { type: "wallBrick", bluePrint: "11.15.V1.COOC", colorMode: "light" },
                { type: "wallBrick", bluePrint: "12.15.V9.OCOC", colorMode: "light" },
                { type: "wallBrick", bluePrint: "9.16.H80.OOCC", colorMode: "dark" },
                { type: "coin", row: 10, col: 24 },
            ],
            npcs: [
                { type: "bug", row: 17, col: 3 }, // not ready yet
            ]
        },
        // LEVEL 2
    ];