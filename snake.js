/*##################################################################################################
  #################################   VARIABLE DECTALRATIONS  ######################################
  ##################################################################################################*/

// HELPER FUNCTIONS

// Get DOM elements (replace document.[querySelector | querySelectorAll])
const $ = (selector, all = false) => all ? [...document.querySelectorAll(selector)] : document.querySelector(selector);
// Replace a character (ch) in a string at index (i)
String.prototype.replaceAt = function (i, ch) { return this.substr(0, i) + ch + this.substr(i + ch.length); }

/*APP has a collection of properties that:
    - stores references to dom elements (less DOM traversing)
    - has values helping the navigation through the app
    - has values displaying the app general layout
    - has info about the app state of loading and settings*/
const app = {
    // DOM ELEMENTS all (prefixed with $)
    $intro: $(".intro"),                               // intros wrapping div
    $mainMenu: $(".main-menu"),                        // main menu
    $game: $(".game"),                                 // games div (stats, game, ?constrol for mobile)
    $control: $(".game__control"),                     // holds control btns (eg for mobile game-play)
    $gameBox: $(".game__box"),                         // holds display table and entity obj divs 
    $entityBox: undefined,                             // holds every game characters', objects' divs (created later)
    $displayTable: undefined,                          // game board that holds character and all game entities (created later)

    // APP VARS
    introDuration: 1,                                  // (+int) -> the intro animation in secs
    loadLevelsState: "pending",                        // ("pending" | "success" | "error") -> if level JSON is loaded
    currentLevel: 1,                                   // (+int) -> default 1 unless local store has level stored
    level: undefined,                                  // (obj)  -> level object is loaded later  
    keyboard: true,                                    // (flag) -> if player can interact with keyboard eg mobile
    gameTablePadding: 10,                              // (+int) -> the padding around the game arena in px
    gameTableCellLength: 21,                           // (+int) -> the width and length of a single arena table cell in px
    interactionAllowed: false,                         // (flag) -> if player can interact with the game
    gameTableIsDrawn: false,                           // (flag) -> risize doesn't affect gametable until its not drawn or level is done
    performanceAvg: [],
};

/* ARENA has a collection of properties that refers to any var that directly affecting
      - gameplay
      - interaction with the level map (arena) and display area (table)
    Most values will be declared by different game-play functions, but they are all defined here for easier readability
    (easier to look up and organize properties, values and their type (eg num, str))*/
const arena = {
    tableRowNum: undefined,                            // (+int) -> the displayable area expressed in table rows (coord)
    tableColNum: undefined,                            // (+int) -> the displayable area expressed in table columns (coord)
    gameEntities: undefined,                           // (arr of arr objs) -> row col of objects that appears on the game map
    parallaxCoefficient: 5,                            // (+int) -> game table background moves slower than the char (px)
    parralaxCenterRowCol: [0, 0],                      // (arr)  -> row and col of the center of the parallax bg when table is built
    charDirection: "",                                 // (str)  -> (up|down|left|right)
    charSpeed: 2,                                      // (+int) -> the time the char needs to step one (ms)
    time: 0,                                           // (+int) -> time that being incremented and triggers char and entitys move
    entityColors: {                                    //     predifined list of the displayable colors -
        "charHead": "transparent",                     //     defined here in order to save computations -
        "charBody": "transparent",                     //     in 2d arr loop of displaying the table (can be > 1000s)
        "crosshair": "rgba(255, 255, 255, 0.03)",
        "wallBrick": "transparent",
    },
    brickColorSequence: {
        brick: [                                       // (obj of arr of str)  -> colors of random individual brick colors
            "#b3a432", "#9c8128", "#ab752b", "#d9a662", "#d99062",
            "#d97862", "#e35839", "#e33f39", "#c7221c", "#ed140c"
        ],
        light: [
            "#ffffffaa", "#ffffffa5", "#ffffffbb", "#ffffffb5", "#ffffffcc",
            "#ffffffc5", "#ffffff80", "#ffffff8a", "#ffffff99", "#ffffffdd",
        ],
        dark: [
            "#ffffff00", "#ffffff10", "#ffffff20", "#ffffff30", "#ffffff2b",
            "#ffffff15", "#ffffff3a", "#ffffff28", "#ffffff38", "#ffffff18",
        ],
        blue: [
            "#c7e2e6", "#9db2b4", "#ade0de", "#a7e1e7", "#86d6d6",
            "#a3baca", "#c9f3f8", "#b0cce6", "#7f8f91", "#97c9c9",
        ]
    }
}

// PERFORMANCE OPTIMISATION
let functionTime = [];


/*##################################################################################################
  #####################################   EVENT LISTENERS  #########################################
  ##################################################################################################*/



// All click events are delegated from body for higher performance (having as few events as possible)
// Events are determined by the DOM elements data-event attribute for consistency and scalability, rather then class, id, ...
function handleClick(e) {
    // delegate all click events on body
    const origin = e.target.getAttribute("data-event");

    switch (origin) {
        case "start-btn": { startLevel(); break; }
    }
}



// For responsivity games display area is scaling proportionally to windows available area
function handleResize() {
    if (app.gameTableIsDrawn) {
        app.$gameBox.removeChild($(".game-arena"));
        buildGameTableArea();
    }
}



// Keypresses are delegated from the entire document, and blocked (or behave differently) when 
// user can interact with the game. (game has started and still actively going)
function handleKeypress(e) {
    if (app.interactionAllowed) {
        switch (e.keyCode) {
            case 38: {
                if (arena.charDirection === "up" && arena.charSpeed < 5) arena.charSpeed++;
                else if (arena.charDirection === "down" && arena.charSpeed > 1) arena.charSpeed--;
                else if (arena.charDirection !== "down") arena.charDirection = "up";
                break;
            }
            case 40: {
                if (arena.charDirection === "down" && arena.charSpeed < 5) arena.charSpeed++;
                else if (arena.charDirection === "up" && arena.charSpeed > 1) arena.charSpeed--;
                else if (arena.charDirection !== "up") arena.charDirection = "down";
                break;
            }
            case 37: {
                if (arena.charDirection === "left" && arena.charSpeed < 5) arena.charSpeed++;
                else if (arena.charDirection === "right" && arena.charSpeed > 1) arena.charSpeed--;
                else if (arena.charDirection !== "right") arena.charDirection = "left";
                break;
            }
            case 39: {
                if (arena.charDirection === "right" && arena.charSpeed < 5) arena.charSpeed++;
                else if (arena.charDirection === "left" && arena.charSpeed > 1) arena.charSpeed--;
                else if (arena.charDirection !== "left") arena.charDirection = "right";
                break;
            }
            case 32: { console.log("SPACE"); }
        }
        console.log(arena.charSpeed, arena.charDirection)
    }
}



/*##################################################################################################
  ###############################   FUNCTIONS FOR STARTING APP  ####################################
  ##################################################################################################*/



// Start of the application on body onload
function start() {
    app.levels = levels;
    setLevelNumFromLocalStorage();

    // the timer responsible for animation at the start of the app
    const introTimer = setInterval(() => {
        --app.introDuration;
        if (!app.introDuration) { clearInterval(introTimer); startGame(); }
    }, 1000);
}



// Find out if browser has level stored, aka user has already played the game before, default 1
function setLevelNumFromLocalStorage() {
    const storageLvl = localStorage.snake_level;
    if (!storageLvl) localStorage.setItem("snake_level", "1");
    else app.currentLevel = Number(localStorage.snake_level);
}



// Display main menu and add events
function startGame() {
    app.$intro.style.display = "none";
    app.$mainMenu.style.display = "flex";

    $("body").addEventListener("click", handleClick);
    document.addEventListener("keydown", handleKeypress)
    window.addEventListener("resize", handleResize);
}



// Set up level configuration
function startLevel() {
    app.$mainMenu.style.display = "none";
    app.$game.style.display = "flex";

    if (app.keyboard) { app.$control.style.display = "none"; }

    // assign current level to app obj
    app.level = app.levels[app.currentLevel - 1];

    arena.gameEntities = buildGameArenaEntitiesObject(app.level.objects);

    buildGameTableArea();
}



function buildGameArenaEntitiesObject(obj) {
    // create an emtpty 2D array
    const entities = Array(app.level.dimension.rows).fill().map(() => Array(app.level.dimension.cols).fill(undefined));


    // check if game character has all properties set properly and build them into game entities
    if (!app.level.gameCharacterCoords) throw new Error("Levels gameCharacterCoords property has not been defined! " + JSON.stringify(app.level));
    if (!Array.isArray(app.level.gameCharacterCoords)) throw new Error("Levels gameCharacterCoords property most be an array " + app.level.gameCharacterCoords);
    if (app.level.gameCharacterCoords.length < 4) throw new Error("Levels gameCharacterCoords property must have at least 4 items! Only found " + app.level.gameCharacterCoords.length + ".");
    app.level.gameCharacterCoords.forEach((coord, i, coordArr) => {
        if (!Array.isArray(coord)) throw new Error("Levels gameCharacter properties items must be all arrays! " + coord);
        if (coord.length !== 2) throw new Error("Game characters coordinates must have 2 items!", + coord);
        if (isNaN(parseInt(coord[0])) || isNaN(parseInt(coord[1]))) throw new Error("Game characters coordinate must be a number! " + coord);

        // coordinates must be in the range of the map
        if (coord[0] < 0 || coord[1] < 0) throw new Error("Game character is out of game maps range! ", coord);
        if (coord[0] > app.level.dimension.rows - 1 || coord[1] > app.level.dimension.cols - 1) throw new Error("Game character is out of game maps range! ", coord);

        // choordinates must connect to the previous element
        if (i !== 0) { // first ind [0] has no previous connenction
            const connectR = connectC = false;
            const prevR = coordArr[i - 1][0];
            const prevC = coordArr[i - 1][1];
            if (Math.abs(coord[0] - prevR) === 1 && coord[1] === prevC) connectR = true;
            if (Math.abs(coord[1] - prevC) === 1 && coord[0] === prevR) connectC = true;
            if (!connectR && !connectC) throw new Error("Character coordinates must have a connection either on a row or a column! " + coord + " " + coordArr[i - 1]);
        }

        entities[coord[0]][coord[1]] = {
            type: (i === 0 ? "charHead" : "charBody"),
            index: i
        }
    });


    // Game objs can have different set of random colors.
    // Colors defined here, in level obj building func, thus they won't change with each redrawal of game table
    const createSequence = () => new Array(10).fill(1).map(n => n * Math.floor(Math.random() * 10));
    obj.forEach(o => {
        switch (o.type) {
            case "wallBrick": {
                const [model, coords] = extractWallsShorthand(o);

                coords.map((coord, i, idsArr) => {
                    modifiedModel = { ...model };
                    // check if no entity is on row, col
                    if (entities[coord[0]][coord[1]]) throw new Error(`Wall Error: Tried to place wall ${o.bluePrint} on occupied area! ${JSON.stringify(entities[coord[0]][coord[1]])}`);

                    // modify longer walls closures to not to close within the wall bricks
                    if (idsArr.length > 1) {
                        if (model.direction === "horizontal") {
                            if (i === 0) modifiedModel.closure = [model.closure[0], 0, model.closure[2], model.closure[3]];
                            else if (i === idsArr.length - 1) modifiedModel.closure = [model.closure[0], model.closure[1], model.closure[2], 0];
                            else modifiedModel.closure = modifiedModel.closure = [model.closure[0], 0, model.closure[2], 0];
                        }

                        if (model.direction === "vertical") {
                            if (i === 0) modifiedModel.closure = [model.closure[0], model.closure[1], 0, model.closure[3]];
                            else if (i === idsArr.length - 1) modifiedModel.closure = [0, model.closure[1], model.closure[2], model.closure[3]];
                            else modifiedModel.closure = [0, model.closure[1], 0, model.closure[3]];
                        }
                    }

                    entities[coord[0]][coord[1]] = {
                        type: o.type,
                        model: modifiedModel || model,
                        colorSequence: createSequence(),
                        colorMode: o.colorMode || "brick"
                    };
                }); // end of msp coord
            } // end of case wallBrick
        } // end of switch game entity object type
    });
    return entities;
}



// Most of the wall object represent many wall bricks, and condensed into a few char syntax
function extractWallsShorthand(wallObj) {
    // extract row, col, model: (hor|ver, closures)
    if (!wallObj.bluePrint || typeof wallObj.bluePrint !== "string") throw new Error("Wall Model: Wall blue print must be declared and it must be a string!\t" + JSON.stringify(wallObj));
    const chunks = wallObj.bluePrint.toUpperCase().split(".");

    if (chunks.length < 3) throw new Error("Wall Error: Badly separated blue-print expression!\t" + wallObj.bluePrint);
    let [row, col, ...descriptors] = chunks;
    row = Number(row); col = Number(col);
    const coordinates = [[row, col]]; // it will be extended if length > 1

    // check rows and colums
    if (isNaN(!parseInt(row)) || isNaN(!parseInt(col))) throw new Error("First two items separated by periods represents the row and column and they must be numbers!\t" + row + " " + col);
    if (row < 0 || col < 0) throw new Error("Wall Error: row or column is out of the range of the game level map\t" + row + " " + col);
    if (row > app.level.dimension.rows - 1 || col > app.level.dimension.cols - 1) throw new Error("Wall Error: row or column is out of the range of the game level map\t" + row + " " + col);

    // check descriptors 1 (wall direction, length) 
    if (descriptors[0][0] !== "H" && descriptors[0][0] !== "V") throw new Error("Wall Error: First character after coordinates must be V or H!\t" + wallObj.model);
    if (!/^(V|H)\d+$/g.test(descriptors[0])) throw new Error("Wall Error: descriptor 1 must contain 1 letter (V|H) followed by only numbers!\t" + descriptors[0]);

    descriptors[0] = descriptors[0].match(/^(V|H)|\d+$/g);
    const [direction, length] = [descriptors[0][0] === "H" ? "horizontal" : "vertical", Number(descriptors[0][1])];

    if (length < 1) throw new Error("Wall Error: length must be greater than 0!\t" + length);
    if (direction === "horizontal" && col + length > app.level.dimension.cols) throw new Error("Wall Error: Wall length is extending wall columns range!\t" + wallObj.bluePrint);
    if (direction === "vertical" && row + length > app.level.dimension.rows) throw new Error("Wall Error: Wall length is extending wall rows range!\t" + wallObj.bluePrint);

    let closure = undefined;

    if (length > 1) {
        // fill up coordinates
        new Array(length - 1)                                                                                        // create arr of length
            .fill()
            .map((_, i) => (direction === "horizontal" ? col : row) + 1 + i)                                         // increment row | col num
            .map(newCord => { coordinates.push(direction === "horizontal" ? [row, newCord] : [newCord, col]) });     // push coord according to direction
    }

    // case no joint -> full closure
    if (descriptors.length === 1 || descriptors[1] === "C") closure = [1, 1, 1, 1];                         // H1 | H1C

    // case fully open 
    else if (descriptors[1] === "O") closure = [0, 0, 0, 0];                                                // V1.O

    // case custom closing lines 
    else if (/^(O|C){4}$/g.test(descriptors[1])) closure = [...descriptors[1]].map(d => d === "C" ? 1 : 0); // V1.OCCO
    else throw new Error("Wall Error: Badly constructed blue-print!\t" + wallObj.bluePrint);

    // check if all coordinates are within map range
    if (coordinates.some(c => (c[0] > app.level.dimension.rows - 1 || c[1] > app.level.dimension.cols - 1 || c[0] < 0 || c[1] < 0))) {
        throw new Error("Wall Error: created wall is out of map range!\t" + wallObj.bluePrint);
    }

    return [{
        direction: direction,
        blueprint: wallObj.bluePrint,
        closure: closure,
    }, coordinates];
}



/*##################################################################################################
  ##############################   BUILD GAMETABLE & POSITIONING  ##################################
  ##################################################################################################*/



// Build a table that displays the level map (or most cases a segment of it), and scale it to the 
// space currently available in the browser window.
function buildGameTableArea() {
    if (app.level.dimension.cols < 10 | app.level.dimension.rows < 10) throw new RangeError(`Level dimension must be min 10x10!\nCurrent dimension on level ${app.currentLevel} is ${app.level.dimension.cols}x${app.level.dimension.rows}.`)
    let height = window.innerHeight;
    let width = window.innerWidth;
    const gameHeight = height - (app.gameTablePadding * 2);
    const gameWidth = width - (app.gameTablePadding * 2);
    const navSpace = app.keyboard ? gameHeight * 0.1 : gameHeight * 0.2; // space for displaying points and navigation etc.
    const maxDisplayableRows = Math.floor((gameHeight - navSpace) / app.gameTableCellLength);
    const maxDisplayableCols = Math.floor(gameWidth / app.gameTableCellLength);
    const rowNum = app.level.dimension.rows <= maxDisplayableRows ? app.level.dimension.rows : maxDisplayableRows;
    const colNum = app.level.dimension.cols <= maxDisplayableCols ? app.level.dimension.cols : maxDisplayableCols;
    const table = document.createElement("table");

    $(".game__stats, .game__control", true).map(elem => elem.style.height = Math.floor(gameHeight / 10) + "px");

    table.classList.add("game-arena");
    for (let r = 0; r < rowNum; r++) {
        const row = document.createElement("tr");
        for (let c = 0; c < colNum; c++) {
            const cell = document.createElement("td");
            arena[`$r${r}c${c}`] = cell; // store cell elements in a var for optimising performance
            row.appendChild(cell);
        }
        table.style.width = colNum * app.gameTableCellLength + "px";
        table.style.height = rowNum * app.gameTableCellLength + "px";
        table.appendChild(row);
    }
    app.$displayTable = table;
    app.$gameBox.appendChild(table);

    arena.tableRowNum = rowNum;
    arena.tableColNum = colNum;

    // delete previous entity box if existed
    const oldEntityBox = $("#entity-box");
    if (oldEntityBox) oldEntityBox.parentNode.removeChild(oldEntityBox);

    // create entity box layer 
    const entityBox = document.createElement("div");
    entityBox.id = "entity-box";
    app.$entityBox = entityBox;
    app.$gameBox.appendChild(entityBox);

    drawAllEntitiesOnGameBox(app.level.objects);
    drawCharacterOnGameBox(app.level.gameCharacterCoords);

    arena.charDirection = arena.charDirection || app.level.gameCharacterDirection;
    app.gameTableIsDrawn = true;
    app.interactionAllowed = true;

    placeTableAndCharsOnMap();
}



// function returns an arr of arr [[row, col], ...]
const findEntitiesRowColIfType = type => {
    const entities = [];
    for (let r = 0; r < arena.gameEntities.length; r++) {
        for (let c = 0; c < arena.gameEntities[r].length; c++) {
            if (arena.gameEntities[r][c] && arena.gameEntities[r][c].type === type) entities.push([r, c]);
        }
    }
    return entities;
}



// position the table on the board centering around the characters head where it's possible
function placeTableAndCharsOnMap() {
    const t0 = performance.now();

    const tableCenRow = Math.floor((arena.tableRowNum - 1) / 2);
    const tableCenCol = Math.floor((arena.tableColNum - 1) / 2);
    const gameCharacterHeadCoords = findEntitiesRowColIfType("charHead");
    let [characterAtRow, characterAtCol] = gameCharacterHeadCoords[0];

    // keep character in range
    if (characterAtRow < 0) gameCharacterHeadCoords[0][0] = characterAtRow = 0;
    if (characterAtCol < 0) gameCharacterHeadCoords[0][1] = characterAtCol = 0;
    if (characterAtRow > app.level.dimension.rows - 1) gameCharacterHeadCoords[0][0] = characterAtRow = app.level.dimension.rows - 1;
    if (characterAtCol > app.level.dimension.cols - 1) gameCharacterHeadCoords[0][1] = characterAtCol = app.level.dimension.cols - 1;

    let displayRowsFrom = characterAtRow - tableCenRow;
    let displayColsFrom = characterAtCol - tableCenCol;

    // keep display table in range
    if (characterAtRow - tableCenRow < 0) displayRowsFrom = 0;
    if (characterAtCol - tableCenCol < 0) displayColsFrom = 0;
    if (displayRowsFrom + arena.tableRowNum - app.level.dimension.rows > 0) displayRowsFrom = app.level.dimension.rows - arena.tableRowNum;
    if (displayColsFrom + arena.tableColNum - app.level.dimension.cols > 0) displayColsFrom = app.level.dimension.cols - arena.tableColNum;

    // animate background (parallax)
    const paralCoef = arena.parallaxCoefficient;
    app.$displayTable.style.backgroundPosition = `${displayColsFrom * paralCoef * -1}px ${displayRowsFrom * paralCoef * -1}px`;

    // loop through an extra grid of rows and cols around table for clearing objects that will go out of tables range
    for (let r = -1; r <= arena.tableRowNum; r++) {
        for (let c = -1; c <= arena.tableColNum; c++) {
            const [rowOnMap, colOnMap] = [displayRowsFrom + r, displayColsFrom + c];

            // check if there is any entity on row col
            if (arena.gameEntities[rowOnMap] && arena.gameEntities[rowOnMap][colOnMap]) {
                const id = arena.gameEntities[rowOnMap][colOnMap].id;

                // clear even if row or col is out of range
                app["$entity_" + id].setAttribute("style", `display: none;`);

                // repaint the ones in range
                if (r >= 0 && c >= 0 && r < arena.tableRowNum && c < arena.tableColNum) {
                    const newStyle = `top: ${r * app.gameTableCellLength}px; left: ${c * app.gameTableCellLength}px; display: block;`;
                    app["$entity_" + id].setAttribute("style", newStyle);
                } // if in range
            } // if entity 
        } // for col
    } // for row

    t1 = performance.now();
    app.performanceAvg.push(t1 - t0)
    if (app.performanceAvg.length % 10 === 0) console.log("PERFORMANCE", (app.performanceAvg.reduce((a, b) => a + b) / app.performanceAvg.length).toFixed(2) + "ms");
}



function drawAllEntitiesOnGameBox() {
    arena.gameEntities.forEach((row, r) => row.map((col, c) => {
        if (!col) return;
        switch (col.type) {
            case "wallBrick": { drawSingleWallBlock(arena.gameEntities[r][c], r, c); break; }
        }
    }));
}


/*##################################################################################################
  ###################################  SVG DRAWING FUNCTIONS  ######################################
  ##################################################################################################*/



function createSvg(attrs) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    Object.keys(attrs).forEach(key => { svg.setAttributeNS(null, key, attrs[key]); });
    return svg;
}



function svgDraw(shape, attrs) {
    const rect = document.createElementNS("http://www.w3.org/2000/svg", shape);
    Object.keys(attrs).forEach(key => { rect.setAttributeNS(null, key, attrs[key]); });
    return rect;
}



const getBrickColor = (n, e) => {
    if (e.ColorMode === "transparent") return "transparent";
    const colorSet = arena.brickColorSequence[e.colorMode];
    const colorInd = e.colorSequence[n % colorSet.length];
    const transparency = (e.colorMode === "brick" || e.colorMode === "blue") ? "70" : "";
    return colorSet[colorInd] + transparency;
}



function drawCharacterOnGameBox(coords) {
    const l = app.gameTableCellLength + 1;

    coords.forEach((ch, i) => {
        const svg = createSvg({ width: l, height: l });
        headRect = svgDraw("rect", { x: 0, y: 0, width: l, height: l, fill: "white" });

        const ind = ch[0] * app.level.dimension.rows + ch[1];
        svg.id = `entity_${ind}`;
        arena.gameEntities[ch[0]][ch[1]].id = ind;
        svg.setAttribute("style", `display: none;`);
        app[`$entity_${ind}`] = svg;
        svg.appendChild(headRect);
        app.$entityBox.appendChild(svg);
    });
}



function drawSingleWallBlock(entity, row, col) {
    const model = entity.model;
    const l = app.gameTableCellLength + 1;
    const svg = createSvg({ width: l, height: l });
    const c1 = "rgba(255, 255, 255, 0.7)";
    const c2 = "rgba(255, 255, 255, 0.25)";
    let rect1, rect2, rect3, rect4, rect5;
    let line1, line2, line3, line4, line5, line6, line7, line8;

    if (model.direction === "horizontal") {
        rect1 = svgDraw("rect", { x: 0, y: 0, width: l / 2, height: l / 3, fill: getBrickColor(0, entity) });
        rect2 = svgDraw("rect", { x: l / 2, y: 0, width: l / 2, height: l / 3, fill: getBrickColor(1, entity) });
        rect3 = svgDraw("rect", { x: 0, y: l / 3, width: l, height: l / 3, fill: getBrickColor(2, entity) });
        rect4 = svgDraw("rect", { x: 0, y: l / 3 * 2, width: l / 2, height: l / 3, fill: getBrickColor(3, entity) });
        rect5 = svgDraw("rect", { x: l / 2, y: l / 3 * 2, width: l / 2, height: l / 3, fill: getBrickColor(4, entity) });
        line5 = svgDraw("line", { x1: 0, x2: l, y1: l / 3, y2: l / 3, stroke: c2, "stroke-width": 1 });
        line6 = svgDraw("line", { x1: 0, x2: l, y1: l / 3 * 2, y2: l / 3 * 2, stroke: c2, "stroke-width": 1 });
        line7 = svgDraw("line", { x1: l / 2, x2: l / 2, y1: 0, y2: l / 3, stroke: c2, "stroke-width": 1 });
        line8 = svgDraw("line", { x1: l / 2, x2: l / 2, y1: l / 3 * 2, y2: l, stroke: c2, "stroke-width": 1 });
    } else {
        rect1 = svgDraw("rect", { x: 0, y: 0, width: l / 3, height: l / 2, fill: getBrickColor(5, entity) });
        rect2 = svgDraw("rect", { x: l / 3, y: 0, width: l / 3, height: l, fill: getBrickColor(6, entity) });
        rect3 = svgDraw("rect", { x: l / 3 * 2, y: 0, width: l / 3, height: l / 2, fill: getBrickColor(7, entity) });
        rect4 = svgDraw("rect", { x: 0, y: l / 2, width: l / 3, height: l / 2, fill: getBrickColor(8, entity) });
        rect5 = svgDraw("rect", { x: l / 3 * 2, y: l / 2, width: l / 3, height: l / 2, fill: getBrickColor(9, entity) });
        line5 = svgDraw("line", { x1: l / 3, x2: l / 3, y1: 0, y2: l, stroke: c2, "stroke-width": 1 });
        line6 = svgDraw("line", { x1: l / 3 * 2, x2: l / 3 * 2, y1: 0, y2: l, stroke: c2, "stroke-width": 1 });
        line7 = svgDraw("line", { x1: 0, x2: l / 3, y1: l / 2, y2: l / 2, stroke: c2, "stroke-width": 1 });
        line8 = svgDraw("line", { x1: l / 3 * 2, x2: l, y1: l / 2, y2: l / 2, stroke: c2, "stroke-width": 1 });
    }

    svg.appendChild(rect1);
    svg.appendChild(rect2);
    svg.appendChild(rect3);
    svg.appendChild(rect4);
    svg.appendChild(rect5);
    svg.appendChild(line5);
    svg.appendChild(line6);
    svg.appendChild(line7);
    svg.appendChild(line8);

    if (model.closure[0]) {
        line1 = svgDraw("line", { x1: 0, x2: l, y1: 1, y2: 1, stroke: c1, "stroke-width": 2 });
        svg.appendChild(line1);
    }
    if (model.closure[1]) {
        line2 = svgDraw("line", { x1: l - 1, x2: l - 1, y1: 0, y2: l, stroke: c1, "stroke-width": 2 });
        svg.appendChild(line2);
    }
    if (model.closure[2]) {
        line3 = svgDraw("line", { x1: 0, x2: l, y1: l - 1, y2: l - 1, stroke: c1, "stroke-width": 2 });
        svg.appendChild(line3);
    }
    if (model.closure[3]) {
        line4 = svgDraw("line", { x1: 1, x2: 1, y1: 0, y2: l - 1, stroke: c1, "stroke-width": 2 });
        svg.appendChild(line4);
    }

    const ind = row * app.level.dimension.rows + col;
    svg.id = `entity_${ind}`;
    arena.gameEntities[row][col].id = ind;
    svg.setAttribute("style", `display: none;`);
    app[`$entity_${ind}`] = svg;
    app.$entityBox.appendChild(svg);
}



/*##################################################################################################
  #####################################  GAMEPLAY FUNCTIONS  #######################################
  ##################################################################################################*/



const gameTimer = setInterval(() => {
    // Circle of actions on board
    // Character
    let ms = 0;
    switch (arena.charSpeed) {
        case 1: { ms = 160; break; }
        case 2: { ms = 90; break; }
        case 3: { ms = 50; break; }
        case 4: { ms = 30; break; }
        case 5: { ms = 20; break; }
    }

    if (arena.time % ms === 0) {
        switch (arena.charDirection) {
            case "up": { moveCharacter(-1, 0); break; }
            case "down": { moveCharacter(1, 0); break; }
            case "left": { moveCharacter(0, -1); break; }
            case "right": { moveCharacter(0, 1); break; }
        }
    }

    arena.time += 10;
    if (arena.time === 10000) arena.time = 0;
}, 10);



function moveCharacter(row, col) {
    // check if next move is in maps range or collides into other entity
    let outOfRange = collides = false;
    const characterCoords = [...findEntitiesRowColIfType("charHead").concat(findEntitiesRowColIfType("charBody"))]
        .sort((p, c) => arena.gameEntities[p[0]][p[1]].index - arena.gameEntities[c[0]][c[1]].index); // sort by index!
    const headCoord = characterCoords[0];

    // check if coords in range (else arr throws error)
    if (headCoord[0] + row < 0 || headCoord[1] + col < 0) outOfRange = true;
    if (headCoord[0] + row > app.level.dimension.rows - 1 || headCoord[1] + col > app.level.dimension.cols - 1) outOfRange = true;
    if (outOfRange) return void (0);

    // check if coords occupied by other entity
    if (arena.gameEntities[headCoord[0] + row][headCoord[1] + col]) collides = true;

    // set direction
    switch ("" + row + col) {
        case "-10": { arena.charDirection = "up"; break; }
        case "10": { arena.charDirection = "down"; break; }
        case "0-1": { arena.charDirection = "left"; break; }
        case "01": { arena.charDirection = "right"; }
    }
    if (collides) return void (0);

    // copy character objs
    const charObjs = characterCoords
        .map(coords => arena.gameEntities[coords[0]][coords[1]])
        .sort((p, c) => p.index - c.index); // sort by index!

    // delete old arr items and move coords
    characterCoords.forEach(coords => arena.gameEntities[coords[0]][coords[1]] = undefined);
    characterCoords.unshift([headCoord[0] + row, headCoord[1] + col]);
    characterCoords.pop();
    app.level.gameCharacterCoords = characterCoords;


    // assign new items to corrisponding arr slots
    characterCoords.forEach((coords, i) => arena.gameEntities[coords[0]][coords[1]] = charObjs[i]);

    placeTableAndCharsOnMap();
}


