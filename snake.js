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
    $levelDisplay: $("#game__stats__level"),           // stats level display
    $pointDisplay: $("#game__stats__points"),          // stats points display
    $lifeDisplay: $("#game__stats__life"),             // stats life display
    $speedDisplay: $("#game__stats__speed"),           // stats speed display
    $directionDisplay: $("#game__stats__direction"),   // stats direction display
    $bulletsDisplay: $("#game__stats__bullets"),       // stats direction bullets
    $control: $(".game__control"),                     // holds control btns (eg for mobile game-play)
    $gameBox: $(".game__box"),                         // holds display table and entity obj divs 
    $entityBox: undefined,                             // holds every game characters', objects' divs (created later)
    $displayTable: undefined,                          // game board that holds character and all game entities (created later)

    // APP VARS
    levelPoints: {                                     // (obj)  -> points made of different actions
        coins: 0,                                      //        -> coins collected
        kills: 0,                                      //        -> enemies killed
    },
    totalPoints: [],                                   // (arr)  -> sum of levelPoints objs (from localStorage if any)
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
    collectedCoins: undefined,                         // (arr)  -> row and col of collected coins (resize redraw would put coins back)
    charDirection: "",                                 // (str)  -> (up|down|left|right)
    charSpeed: 2,                                      // (+int) -> the time the char needs to step one (ms)
    charLife: 100,                                     // (+int) -> life is expressed in percentage (0% death)
    charBullets: 0,                                    // (+int) -> bullets loads from localStorage
    charIsShooting: false,                             // (flag) -> one bullet is shot a time
    time: 0,                                           // (+int) -> time that being incremented and triggers char and entitys move
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
            case 32: { if (!arena.charIsShooting) shoot(); }
        }
        upDateStats();
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
    upDateStats("level");
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

    arena.charBullets = 20;
    arena.charLife = 100;
    arena.collectedCoins = []; // empty collected coins so they all can be redrawn
    arena.charDirection = app.levels[app.currentLevel - 1].gameCharacterDirection;
    upDateStats();

    buildGameTableArea();
}



// Function builds a 2D array (app.gameEntities[row][col]) from app.level with objects
// representing the games characters, npcs and the environment.
function buildGameArenaEntitiesObject(obj) {
    // create an emtpty 2D array
    const entities = Array(app.level.dimension.rows).fill().map(() => Array(app.level.dimension.cols).fill(undefined));


    function checkCellIsInRangeAndUnoccupied(obj, row, col, name) {
        const msg = `Error while building a ${name} into gameEtities obj! `;
        const objStr = JSON.stringify(obj);
        const [maxRow, maxCol] = [app.level.dimension.rows - 1, app.level.dimension.cols - 1];

        if (row < 0) throw new Error(`${msg}\nRow can not be smaller than 0!\n${objStr}`);
        if (col < 0) throw new Error(`${msg}\nColumn can not be smaller than 0!\n${objStr}`);
        if (row > maxRow) throw new Error(`${msg}
            \nRow can not be greater than the game tables dimension (${maxRow} x ${maxCol})!
            \nMax is ${maxRow - 1}
            \n${objStr}`);

        if (col > maxCol) throw new Error(`${msg}
            \nColumn can not be greater than the game tables dimension (${maxCol} x ${maxCol})!
            \nMax is ${maxCol - 1}
            \n${objStr}`);

        if (entities[row][col]) throw new Error(`${msg}
            \nCould not assign ${objStr} to cell (row:${row}, column${col}), because it was occupied by
            \n${JSON.stringify(entities[row][col])}`);

        return true;
    }


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
            let connectR = connectC = false;
            const prevR = coordArr[i - 1][0];
            const prevC = coordArr[i - 1][1];
            if (Math.abs(coord[0] - prevR) === 1 && coord[1] === prevC) connectR = true;
            if (Math.abs(coord[1] - prevC) === 1 && coord[0] === prevR) connectC = true;
            if (!connectR && !connectC) throw new Error("Character coordinates must have a connection either on a row or a column! " + coord + " " + coordArr[i - 1]);
        }

        entities[coord[0]][coord[1]] = {
            type: (i === 0 ? "charHead" : i === app.level.gameCharacterCoords.length - 1 ? "charTail" : "charBody"),
            drawMethod: "dinamic", // char can look differently by every redraw
            skins: [], // the possible skins
            blocking: { char: true, bullet: true }, // if objects is interacting with characters or bullets
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
                    if (checkCellIsInRangeAndUnoccupied(model, ...coord, "wall")) {
                        // modify longer walls closures to not to close within the wall bricks
                        if (idsArr.length > 1) {
                            if (model.direction === "horizontal") {
                                if (i === 0) modifiedModel.closure = [model.closure[0], 0, model.closure[2], model.closure[3]];
                                else if (i === idsArr.length - 1) modifiedModel.closure = [model.closure[0], model.closure[1], model.closure[2], 0];
                                else modifiedModel.closure = modifiedModel.closure = [model.closure[0], 0, model.closure[2], 0];
                            } // end of direction horizontal

                            if (model.direction === "vertical") {
                                if (i === 0) modifiedModel.closure = [model.closure[0], model.closure[1], 0, model.closure[3]];
                                else if (i === idsArr.length - 1) modifiedModel.closure = [0, model.closure[1], model.closure[2], model.closure[3]];
                                else modifiedModel.closure = [0, model.closure[1], 0, model.closure[3]];
                            } // end of direction vertical
                        } // end of if ids array length is greater then one

                        entities[coord[0]][coord[1]] = {
                            type: o.type,
                            model: modifiedModel || model,
                            colorSequence: createSequence(),
                            colorMode: o.colorMode || "brick",
                            blocking: { char: true, bullet: true }, // if objects is interacting with characters or bullets
                            drawMethod: "static"  // by every redraw it looks the same
                        }; // end of wall entity object
                    } // end of if cell is in range and unoccupied
                }); // end of map coord
                break;
            } // end of case wallBrick
            case "coin": {
                // if coin was already collected, don't redraw them
                if (!arena.collectedCoins.find(coinRC => coinRC[0] === o.row && coinRC[1] === o.col)) {
                    if (checkCellIsInRangeAndUnoccupied(o, o.row, o.col, o.type)) {
                        entities[o.row][o.col] = {
                            type: o.type,
                            drawMethod: "static",
                            blocking: { char: false, bullet: false },
                        };
                    }
                }
                break;
            } // end of case coin
            case "electro": {
                if (checkCellIsInRangeAndUnoccupied(o, o.row, o.col, o.type)) {
                    if (o.direction !== "up" && o.direction !== "down" && o.direction !== "left" && o.direction !== "right") throw new Error(`Error while building electric wall:\n${JSON.stringify(o)} direction is invalid! (${o.direction})`);
                    if (!Array.isArray(o.openCloseInterval) || o.openCloseInterval.length < 2 || o.openCloseInterval.length % 2 !== 0) throw new Error(`
                    Error while building electric wall!
                    \n openCloseInterval must be provided, it must be an array, of length min 2, length must be even number!
                    \n ${o.openCloseInterval}\nat\n${JSON.stringify(o)}`);

                    entities[o.row][o.col] = {
                        type: o.type,
                        direction: o.direction,
                        openCloseInterval: o.openCloseInterval,
                        drawMethod: "static",
                        blocking: { char: true, bullet: false },
                        direction: o.direction
                    };
                }
                break;
            }
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

    arena.gameEntities = buildGameArenaEntitiesObject(app.level.objects);

    drawAllEntitiesOnGameBox(app.level.objects);
    drawCharacterSkins(app.level.gameCharacterCoords);

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

    arena.displayRowsFrom = characterAtRow - tableCenRow;
    arena.displayColsFrom = characterAtCol - tableCenCol;

    // keep display table in range
    if (characterAtRow - tableCenRow < 0) arena.displayRowsFrom = 0;
    if (characterAtCol - tableCenCol < 0) arena.displayColsFrom = 0;
    if (arena.displayRowsFrom + arena.tableRowNum - app.level.dimension.rows > 0) arena.displayRowsFrom = app.level.dimension.rows - arena.tableRowNum;
    if (arena.displayColsFrom + arena.tableColNum - app.level.dimension.cols > 0) arena.displayColsFrom = app.level.dimension.cols - arena.tableColNum;

    // animate background (parallax)
    const paralCoef = arena.parallaxCoefficient;
    app.$displayTable.style.backgroundPosition = `${arena.displayColsFrom * paralCoef * -1}px ${arena.displayRowsFrom * paralCoef * -1}px`;

    // loop through an extra grid of rows and cols around table for clearing objects that will go out of tables range
    for (let r = -1; r <= arena.tableRowNum; r++) {
        for (let c = -1; c <= arena.tableColNum; c++) {
            const [rowOnMap, colOnMap] = [arena.displayRowsFrom + r, arena.displayColsFrom + c];

            // check if there is any entity on row col
            if (arena.gameEntities[rowOnMap] && arena.gameEntities[rowOnMap][colOnMap]) {
                const entity = arena.gameEntities[rowOnMap][colOnMap];
                const id = entity.id;

                // clear even if row or col is out of range
                if (entity.drawMethod === "static") {
                    app["$entity_" + id].setAttribute("style", `display: none;`);
                } else { [...app["$entity_" + id].children].forEach(svg => svg.style.display = "none"); }

                // repaint the ones in range
                if (r >= 0 && c >= 0 && r < arena.tableRowNum && c < arena.tableColNum) {
                    if (entity.drawMethod === "static") {
                        const newStyle = `
                            top: ${r * app.gameTableCellLength}px;
                            left: ${c * app.gameTableCellLength}px;
                            display: block;
                        `;
                        app["$entity_" + id].setAttribute("style", newStyle);
                    } // if static
                    else {
                        displayCaracterAndNPCs(entity, id, r, c);
                    } // if dinamic
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
            case "wallBrick": { drawWall(arena.gameEntities[r][c], r, c); break; }
            case "coin": { drawCoin(r, c); break; }
            case "electro": { drawElectricWall(arena.gameEntities[r][c], r, c); break; }
        }
    }));
}


function displayCaracterAndNPCs(entity, id, r, c) {
    switch (entity.type) {
        case "charHead": {
            const dir = arena.charDirection || app.level.gameCharacterDirection;
            const skin = entity.skins.find(sk => sk["head_" + dir]);
            const svg = skin["head_" + dir];
            const newStyle = `top: ${r * app.gameTableCellLength}px; left: ${c * app.gameTableCellLength}px; display: block;`;
            svg.setAttribute("style", newStyle);
            break;
        }
        case "charBody": {
            const bodyInd = entity.index;
            const [prev, curr, next] = [app.level.gameCharacterCoords[bodyInd - 1], app.level.gameCharacterCoords[bodyInd], app.level.gameCharacterCoords[bodyInd + 1]];

            let jointType = undefined;
            if (prev[0] === curr[0] && curr[0] === next[0]) jointType = "body_hor_str";
            else if (prev[1] === curr[1] && curr[1] === next[1]) jointType = "body_ver_str";
            else if (prev[0] === curr[0] && prev[1] === curr[1] + 1 && next[0] === curr[0] + 1 && next[1] === curr[1]) jointType = "body_ver_right";
            else if (prev[0] === curr[0] && prev[1] === curr[1] + 1 && next[0] === curr[0] - 1 && next[1] === curr[1]) jointType = "body_ver_left";
            else if (prev[0] === curr[0] && prev[1] === curr[1] - 1 && next[0] === curr[0] - 1 && next[1] === curr[1]) jointType = "body_hor_up";
            else if (prev[0] === curr[0] && prev[1] === curr[1] - 1 && next[0] === curr[0] + 1 && next[1] === curr[1]) jointType = "body_hor_down";
            else if (prev[0] === curr[0] + 1 && prev[1] === curr[1] && next[0] === curr[0] && next[1] === curr[1] - 1) jointType = "body_hor_down";
            else if (prev[0] === curr[0] + 1 && prev[1] === curr[1] && next[0] === curr[0] && next[1] === curr[1] + 1) jointType = "body_ver_right";
            else if (prev[0] === curr[0] - 1 && prev[1] === curr[1] && next[0] === curr[0] && next[1] === curr[1] - 1) jointType = "body_hor_up";
            else if (prev[0] === curr[0] - 1 && prev[1] === curr[1] && next[0] === curr[0] && next[1] === curr[1] + 1) jointType = "body_ver_left";

            const skin = entity.skins.find(sk => sk[jointType]);
            const svg = skin[jointType];
            const newStyle = `top: ${r * app.gameTableCellLength}px; left: ${c * app.gameTableCellLength}px; display: block;`;
            svg.setAttribute("style", newStyle);
            break;
        }
        case "charTail": {
            const tailInd = entity.index;
            const [prev, curr] = [app.level.gameCharacterCoords[tailInd - 1], app.level.gameCharacterCoords[tailInd]];
            let jointType = undefined;
            if (prev[0] < curr[0]) jointType = "tail_from_N";
            if (prev[0] > curr[0]) jointType = "tail_from_S";
            if (prev[1] < curr[1]) jointType = "tail_from_W";
            if (prev[1] > curr[1]) jointType = "tail_from_E";

            const skin = entity.skins.find(sk => sk[jointType]);
            const svg = skin[jointType];
            const newStyle = `top: ${r * app.gameTableCellLength}px; left: ${c * app.gameTableCellLength}px; display: block;`;
            svg.setAttribute("style", newStyle);
            break;
        }
    } // end of switch entity type
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



function drawCharacterSkins(coords) {
    const l = app.gameTableCellLength + 1;
    const c1 = "rgb(128, 255, 217)";
    const c2 = "rgba(128, 255, 217, 0.35)";

    coords.forEach((ch, i, choordsArr) => {
        const skinBox = document.createElement("div");
        skinBox.setAttribute("style", `width: ${l}px; height: ${l}px;`);

        const ind = ch[0] * app.level.dimension.rows + ch[1];
        skinBox.id = `entity_${ind}`;
        arena.gameEntities[ch[0]][ch[1]].id = ind;

        // HEAD
        if (i === 0) {
            // HEAD UP
            const svgHeadUp = createSvg({ width: l - 1, height: l - 1 });
            svgHeadUp.setAttribute("style", `display: block;`);
            const pathUp = `M ${l / 5} ${l / 2} q ${l / 5 * 1.5} -${l - l / 5} ${l - l / 5 * 2} 0 v ${l / 2} h -${l - l / 5 * 2} z`;
            const facePathUp = svgDraw("path", { d: pathUp, stroke: c1, fill: c2 });
            const eye1Up = svgDraw("circle", { cx: l / 3 + 1, cy: l / 3 * 2, r: l / 10, fill: "rgba(0, 0, 0, 0.85)" });
            const eye2Up = svgDraw("circle", { cx: l - l / 3 - 1, cy: l / 3 * 2, r: l / 10, fill: "rgba(0, 0, 0, 0.85)" });
            svgHeadUp.appendChild(facePathUp);
            svgHeadUp.appendChild(eye1Up);
            svgHeadUp.appendChild(eye2Up);
            arena.gameEntities[ch[0]][ch[1]].skins.push({ "head_up": svgHeadUp });
            skinBox.appendChild(svgHeadUp);

            // HEAD DOWN
            const svgHeadDown = createSvg({ width: l - 1, height: l - 1 });
            svgHeadDown.setAttribute("style", `display: block;`);
            const pathDown = `M ${l / 5} ${l / 2} q ${l / 5 * 1.5} ${l - l / 5} ${l - l / 5 * 2} 0 v -${l / 2 + 1} h -${l - l / 5 * 2} z`;
            const facePathDown = svgDraw("path", { d: pathDown, stroke: c1, fill: c2 });
            const eye1Down = svgDraw("circle", { cx: l / 3 + 1, cy: l / 3, r: l / 10, fill: "rgba(0, 0, 0, 0.85)" });
            const eye2Down = svgDraw("circle", { cx: l - l / 3 - 1, cy: l / 3, r: l / 10, fill: "rgba(0, 0, 0, 0.85)" });
            svgHeadDown.appendChild(facePathDown);
            svgHeadDown.appendChild(eye1Down);
            svgHeadDown.appendChild(eye2Down);
            arena.gameEntities[ch[0]][ch[1]].skins.push({ "head_down": svgHeadDown });
            skinBox.appendChild(svgHeadDown);

            // HEAD LEFT
            const svgHeadLeft = createSvg({ width: l - 1, height: l - 1 });
            svgHeadLeft.setAttribute("style", `display: block;`);
            const pathLeft = `M ${l / 2} ${l / 5} q -${l - 3} ${l / 5 * 1.5} 0 ${l / 5 * 1.5 * 2} h ${l / 2} v -${l - l / 5 * 2} z `;
            const facePathLeft = svgDraw("path", { d: pathLeft, stroke: c1, fill: c2 });
            const eye1Left = svgDraw("circle", { cx: l / 3 * 2, cy: l / 3 + 1, r: l / 10, fill: "rgba(0, 0, 0, 0.85)" });
            const eye2Left = svgDraw("circle", { cx: l / 3 * 2, cy: l - l / 3 - 1, r: l / 10, fill: "rgba(0, 0, 0, 0.85)" });
            svgHeadLeft.appendChild(facePathLeft);
            svgHeadLeft.appendChild(eye1Left);
            svgHeadLeft.appendChild(eye2Left);
            arena.gameEntities[ch[0]][ch[1]].skins.push({ "head_left": svgHeadLeft });
            skinBox.appendChild(svgHeadLeft);

            // HEAD RIGHT
            const svgHeadRight = createSvg({ width: l - 1, height: l - 1 });
            svgHeadRight.setAttribute("style", `display: block;`);
            const pathRight = `M ${l / 2} ${l - l / 5} q ${l - 3} -${l / 5 * 1.5} 0 -${l / 5 * 1.5 * 2} h -${l / 2 + 1} v ${l - l / 5 * 2} z `;
            const facePathRight = svgDraw("path", { d: pathRight, stroke: c1, fill: c2 });
            const eye1Right = svgDraw("circle", { cx: l / 3, cy: l / 3 + 1, r: l / 10, fill: "rgba(0, 0, 0, 0.85)" });
            const eye2Right = svgDraw("circle", { cx: l / 3, cy: l - l / 3 - 1, r: l / 10, fill: "rgba(0, 0, 0, 0.85)" });
            svgHeadRight.appendChild(facePathRight);
            svgHeadRight.appendChild(eye1Right);
            svgHeadRight.appendChild(eye2Right);
            arena.gameEntities[ch[0]][ch[1]].skins.push({ "head_right": svgHeadRight });
            skinBox.appendChild(svgHeadRight);
        }
        // TAIL
        else if (i === choordsArr.length - 1) {
            // TAIL JOINS FROM NORTH
            const svgTailFromNorth = createSvg({ width: l - 1, height: l - 1 });
            svgTailFromNorth.setAttribute("style", `display: block;`);
            const pathTailN = `m ${l / 5} -1 v ${l / 5} l ${l / 2 - l / 5} ${l - l / 5 - 1} l ${l / 2 - l / 5} -${l - l / 5 - 1} v -${l / 5 + 1} z`;
            const tailN = svgDraw("path", { d: pathTailN, stroke: c1, fill: c2 });
            svgTailFromNorth.appendChild(tailN);
            arena.gameEntities[ch[0]][ch[1]].skins.push({ "tail_from_N": svgTailFromNorth });
            skinBox.appendChild(svgTailFromNorth);

            // TAIL JOINS FROM SOUTH
            const svgTailFromSouth = createSvg({ width: l - 1, height: l - 1 });
            svgTailFromSouth.setAttribute("style", `display: block;`);
            const pathTailS = `m ${l / 5} ${l} v -${l / 5} l ${l / 2 - l / 5} -${l - l / 5} l ${l / 2 - l / 5} ${l - l / 5} v ${l / 5} z`;
            const tailS = svgDraw("path", { d: pathTailS, stroke: c1, fill: c2 });
            svgTailFromSouth.appendChild(tailS);
            arena.gameEntities[ch[0]][ch[1]].skins.push({ "tail_from_S": svgTailFromSouth });
            skinBox.appendChild(svgTailFromSouth);

            // TAIL JOINS FROM WEST
            const svgTailFromWest = createSvg({ width: l - 1, height: l - 1 });
            svgTailFromWest.setAttribute("style", `display: block;`);
            const pathTailW = `m -1 ${l / 5} h ${l / 5} l ${l - l / 5} ${l / 2 - l / 5} l -${l - l / 5} ${l / 2 - l / 5} h -${l / 5 + 1} z`;
            const tailW = svgDraw("path", { d: pathTailW, stroke: c1, fill: c2 });
            svgTailFromWest.appendChild(tailW);
            arena.gameEntities[ch[0]][ch[1]].skins.push({ "tail_from_W": svgTailFromWest });
            skinBox.appendChild(svgTailFromWest);

            // TAIL JOINS FROM EAST
            const svgTailFromEast = createSvg({ width: l - 1, height: l - 1 });
            svgTailFromEast.setAttribute("style", `display: block;`);
            const pathTailE = `m ${l} ${l / 5} h -${l / 5} l -${l - l / 5} ${l / 2 - l / 5} l ${l - l / 5} ${l / 2 - l / 5} h ${l / 5} z`;
            const tailE = svgDraw("path", { d: pathTailE, stroke: c1, fill: c2 });
            svgTailFromEast.appendChild(tailE);
            arena.gameEntities[ch[0]][ch[1]].skins.push({ "tail_from_E": svgTailFromEast });
            skinBox.appendChild(svgTailFromEast);

        }
        // BODY
        else {
            // HORIZONTAL STRAIGHT
            const svgBodyHorStraight = createSvg({ width: l - 1, height: l - 1 });
            svgBodyHorStraight.setAttribute("style", `display: block;`);
            const pathHorStr = `M -1 ${l / 5} h ${l + 2} v ${l - l / 5 * 2} h -${l + 2} z`;
            const bodyPathHorStr = svgDraw("path", { d: pathHorStr, stroke: c1, fill: c2 });
            svgBodyHorStraight.appendChild(bodyPathHorStr);
            arena.gameEntities[ch[0]][ch[1]].skins.push({ "body_hor_str": svgBodyHorStraight });
            skinBox.appendChild(svgBodyHorStraight);

            // HORIZONTAL UP
            const svgBodyHorUp = createSvg({ width: l - 1, height: l - 1 });
            svgBodyHorUp.setAttribute("style", `display: block;`);
            const pathHorUp = `m -1 ${l / 5} h ${l / 5 + 1} v -${l / 5 + 1} h ${l - l / 5 * 2} v ${l / 5 + 1} 
            a -${l - l / 5 * 2} -${l - l / 5 * 2} 0 0 1 -${l - l / 5 * 2} ${l - l / 5 * 2} h -${l / 5 + 1} z`;
            const bodyPathHorUp = svgDraw("path", { d: pathHorUp, stroke: c1, fill: c2 });
            svgBodyHorUp.appendChild(bodyPathHorUp);
            arena.gameEntities[ch[0]][ch[1]].skins.push({ "body_hor_up": svgBodyHorUp });
            skinBox.appendChild(svgBodyHorUp);

            // HORIZONTAL DOWN
            const svgBodyHorDown = createSvg({ width: l - 1, height: l - 1 });
            svgBodyHorDown.setAttribute("style", `display: block;`);
            const pathHorDown = `m -1 ${l / 5} h ${l / 5 + 1} a ${l - l / 5 * 2} ${l - l / 5 * 2} 0 0 1 
            ${l - l / 5 * 2} ${l - l / 5 * 2} v ${l / 5} h -${l - l / 5 * 2} v -${l / 5} h -${l / 5 + 1} z`;
            const bodyPathHorDown = svgDraw("path", { d: pathHorDown, stroke: c1, fill: c2 });
            svgBodyHorDown.appendChild(bodyPathHorDown);
            arena.gameEntities[ch[0]][ch[1]].skins.push({ "body_hor_down": svgBodyHorDown });
            skinBox.appendChild(svgBodyHorDown);

            // VERTICAL STRAIGHT
            const svgBodyVerStraight = createSvg({ width: l - 1, height: l - 1 });
            svgBodyVerStraight.setAttribute("style", `display: block;`);
            const pathVerStr = `M ${l / 5} -1 v ${l + 2} h ${l - l / 5 * 2} v -${l + 2} z`;
            const bodyPathVerStr = svgDraw("path", { d: pathVerStr, stroke: c1, fill: c2 });
            svgBodyVerStraight.appendChild(bodyPathVerStr);
            arena.gameEntities[ch[0]][ch[1]].skins.push({ "body_ver_str": svgBodyVerStraight });
            skinBox.appendChild(svgBodyVerStraight);

            // VERTICAL LEFT
            const svgBodyVerLeft = createSvg({ width: l - 1, height: l - 1 });
            svgBodyVerLeft.setAttribute("style", `display: block;`);
            const pathVerLeft = `m ${l} ${l / 5} h -${l / 5} v -${l / 5 + 1} h -${l - l / 5 * 2} v ${l / 5 + 1} 
            a ${l - l / 5 * 2} ${l - l / 5 * 2} 0 0 0 ${l - l / 5 * 2} ${l - l / 5 * 2} h ${l / 5} z`;
            const bodyPathVerLeft = svgDraw("path", { d: pathVerLeft, stroke: c1, fill: c2 });
            svgBodyVerLeft.appendChild(bodyPathVerLeft);
            arena.gameEntities[ch[0]][ch[1]].skins.push({ "body_ver_left": svgBodyVerLeft });
            skinBox.appendChild(svgBodyVerLeft);

            // VERTICAL RIGHT
            const svgBodyVerRight = createSvg({ width: l - 1, height: l - 1 });
            svgBodyVerRight.setAttribute("style", `display: block;`);
            const pathVerRight = `m ${l} ${l / 5} h -${l / 5} a -${l - l / 5 * 2} -${l - l / 5 * 2} 0 0 0 
            -${l - l / 5 * 2} ${l - l / 5 * 2} v ${l / 5} h ${l - l / 5 * 2} v -${l / 5} h ${l / 5} z`;
            const bodyPathVerRight = svgDraw("path", { d: pathVerRight, stroke: c1, fill: c2 });
            svgBodyVerRight.appendChild(bodyPathVerRight);
            arena.gameEntities[ch[0]][ch[1]].skins.push({ "body_ver_right": svgBodyVerRight });
            skinBox.appendChild(svgBodyVerRight);
        }

        app.$entityBox.appendChild(skinBox);
        app[`$entity_${ind}`] = skinBox;
    });
}



function drawWall(entity, row, col) {
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



function drawCoin(row, col) {
    const ind = row * app.level.dimension.rows + col;
    const l = app.gameTableCellLength + 1;
    const svg = createSvg({ width: l, height: l });
    const c1 = "#fcbe52";
    const c2 = "#f9fe9c";
    const x = l / 3 + (2 * (l / 9));

    const cir1 = svgDraw("circle", { cx: l / 2, cy: l / 2, r: l / 3, stroke: c1, fill: c2, "stroke-width": l / 10 });
    const pathStr = `M ${l / 3} ${l - l / 3} h ${l / 3} 
    l ${l / 9} -${l / 4}
    l -${x / 4} ${l / 8}
    l -${x / 4} -${l / 8}
    l -${x / 4} ${l / 8}
    l -${x / 4} -${l / 8} z`;
    const path = svgDraw("path", { d: pathStr, stroke: c1, fill: "rgba(0, 0, 0, 0.2)", "stroke-width": l / 10 });

    svg.appendChild(cir1);
    svg.appendChild(path);

    svg.id = `entity_${ind}`;
    svg.classList.add("coin");
    svg.classList.add(`coin-delay${Math.floor(Math.random() * 4)}`);
    arena.gameEntities[row][col].id = ind;
    svg.setAttribute("style", `display: none;`);
    app[`$entity_${ind}`] = svg;
    app.$entityBox.appendChild(svg);
}



function drawElectricWall(entity, row, col) {
    console.log(entity, row, col);
    const ind = row * app.level.dimension.rows + col;
    const l = app.gameTableCellLength + 1;
    const w = entity.direction === "right" || entity.direction === "left" ? l * 2 : l;
    const h = entity.direction === "up" || entity.direction === "down" ? l * 2 : l;
    const svg = createSvg({ width: w, height: h });
    const c1 = "rgba(255, 255, 255, 0.85)";
    const c2 = "rgba(255, 255, 255, 0.35)";

    rect = svgDraw("rect", { x: 1, y: 1, width: l - 2, height: l - 2, stroke: c1, "stroke-width": 2, fill: "transparent" });
    svg.appendChild(rect);
    const line1 = svgDraw("line", { x1: 2, x2: l / 5 + (l / 5) / 2, y1: l / 5 + (l / 5) / 2, y2: 2, stroke: c2 });
    svg.appendChild(line1);
    const line2 = svgDraw("line", { x1: 2, x2: (l / 5 + (l / 5) / 2) * 2, y1: (l / 5 + (l / 5) / 2) * 2, y2: 2, stroke: c2 });
    svg.appendChild(line2);
    const line3 = svgDraw("line", { x1: 2, x2: (l / 5 + (l / 5) / 2) * 3, y1: (l / 5 + (l / 5) / 2) * 3, y2: 2, stroke: c2 });
    svg.appendChild(line3);
    const line4 = svgDraw("line", { x1: l / 5 + (l / 5) / 2 + 2, x2: (l / 5 + (l / 5) / 2) * 3, y1: (l / 5 + (l / 5) / 2) * 3, y2: l / 5 + (l / 5) / 2 + 2, stroke: c2 });
    svg.appendChild(line4);
    const line5 = svgDraw("line", { x1: (l / 5 + (l / 5) / 2) * 2 + 2, x2: (l / 5 + (l / 5) / 2) * 3, y1: (l / 5 + (l / 5) / 2) * 3, y2: (l / 5 + (l / 5) / 2) * 2 + 2, stroke: c2 });
    svg.appendChild(line5);
    const line6 = svgDraw("line", { x1: l / 5 + (l / 5) / 2, x2: 2, y1: l - 2, y2: (l / 5 + (l / 5) / 2) * 2 + 2, stroke: c2 });
    svg.appendChild(line6);
    const line7 = svgDraw("line", { x1: (l / 5 + (l / 5) / 2) * 2, x2: 2, y1: l - 2, y2: l / 5 + (l / 5) / 2 + 2, stroke: c2 });
    svg.appendChild(line7);
    const line8 = svgDraw("line", { x1: l - 2, x2: 2, y1: l - 2, y2: 2, stroke: c2 });
    svg.appendChild(line8);
    const line9 = svgDraw("line", { x1: l - 2, x2: l / 5 + (l / 5) / 2 + 2, y1: (l / 5 + (l / 5) / 2) * 2, y2: 2, stroke: c2 });
    svg.appendChild(line9);
    const line10 = svgDraw("line", { x1: l - 2, x2: (l / 5 + (l / 5) / 2) * 2 + 2, y1: l / 5 + (l / 5) / 2, y2: 2, stroke: c2 });
    svg.appendChild(line10);
    const path1 = svgDraw("path", { d: `M ${l / 2} ${l / 2 - l / 5 + 2} l ${l / 2 - l / 5} ${l / 10} l -${l / 2 - l / 5} ${l / 10} z`, stroke: "rgb(146, 233, 240)", fill: "rgb(130, 210, 255)" });
    svg.appendChild(path1);

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
        case 1: { ms = 240; break; }
        case 2: { ms = 120; break; }
        case 3: { ms = 60; break; }
        case 4: { ms = 40; break; }
        case 5: { ms = 30; break; }
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
    const characterCoords = [...findEntitiesRowColIfType("charHead").concat(findEntitiesRowColIfType("charBody")).concat(findEntitiesRowColIfType("charTail"))]
        .sort((p, c) => arena.gameEntities[p[0]][p[1]].index - arena.gameEntities[c[0]][c[1]].index); // sort by index!
    const headCoord = characterCoords[0];

    // check if coords in range (else arr throws error)
    if (headCoord[0] + row < 0 || headCoord[1] + col < 0) outOfRange = true;
    if (headCoord[0] + row > app.level.dimension.rows - 1 || headCoord[1] + col > app.level.dimension.cols - 1) outOfRange = true;
    if (outOfRange) return void (0);

    // check if coords occupied by another blocking entity
    const mapCell = arena.gameEntities[headCoord[0] + row][headCoord[1] + col];
    if (mapCell) {
        if (mapCell.blocking.char) collides = true;
        else {
            switch (mapCell.type) {
                case "coin": { collectCoin(mapCell, headCoord[0] + row, headCoord[1] + col); break; }
            }
        }
    }

    if (collides) return void (0);

    // set direction
    switch ("" + row + col) {
        case "-10": { arena.charDirection = "up"; break; }
        case "10": { arena.charDirection = "down"; break; }
        case "0-1": { arena.charDirection = "left"; break; }
        case "01": { arena.charDirection = "right"; }
    }

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



function shoot() {
    if (arena.charBullets <= 0) return void (0);

    const headRC = app.level.gameCharacterCoords[0];
    const direction = arena.charDirection;

    // don't shoot when by the edges of display table
    if (direction === "up" && headRC[0] <= 0) return void (0);
    if (direction === "down" && headRC[0] >= arena.displayRowsFrom + arena.tableRowNum - 1) return void (0);
    if (direction === "left" && headRC[1] <= 0) return void (0);
    if (direction === "right" && headRC[1] >= arena.displayColsFrom + arena.tableColNum - 1) return void (0);

    arena.charBullets--;
    upDateStats("bullets");

    // create bullet svg
    const l = app.gameTableCellLength;
    const svgBullet = createSvg({ width: l, height: l });
    let lineBullet;

    (direction === "down" || direction === "up")
        ? lineBullet = svgDraw("line", { x1: (l + 1) / 2, x2: (l + 1) / 2, y1: (l + 1) / 3, y2: (l + 1) / 3 * 2, stroke: "deeppink", "stroke-width": 3 })
        : lineBullet = svgDraw("line", { x1: (l + 1) / 3, x2: (l + 1) / 3 * 2, y1: (l + 1) / 2, y2: (l + 1) / 2, stroke: "deeppink", "stroke-width": 3 });
    svgBullet.appendChild(lineBullet);
    app.$entityBox.appendChild(svgBullet);

    let shootingDirection = arena.charDirection;
    let counter = 0;
    arena.charIsShooting = true;

    function displayBullet(c) {
        switch (shootingDirection) {
            case "down": {
                svgBullet.setAttribute("style", `
                 top: ${headRC[0] * l + c * l - arena.displayRowsFrom * l}px; 
                 left: ${headRC[1] * l - arena.displayColsFrom * l}px;
                 `);
                break;
            }
            case "up": {
                svgBullet.setAttribute("style", `
                 top: ${headRC[0] * l - c * l - arena.displayRowsFrom * l}px; 
                 left: ${headRC[1] * l - arena.displayColsFrom * l}px;
                 `);
                break;
            }
            case "left": {
                svgBullet.setAttribute("style", `
                 top: ${headRC[0] * l - arena.displayRowsFrom * l}px; 
                 left: ${headRC[1] * l - c * l - arena.displayColsFrom * l}px;
                 `);
                break;
            }
            case "right": {
                svgBullet.setAttribute("style", `
                 top: ${headRC[0] * l - arena.displayRowsFrom * l}px; 
                 left: ${headRC[1] * l + c * l - arena.displayColsFrom * l}px;
                 `);
                break;
            }
        }
    }

    function checkIfBulletIsStillInRange(c) {
        let inRange = true;
        switch (shootingDirection) {
            case "up": { if (headRC[0] - c < arena.displayRowsFrom) inRange = false; break; }
            case "down": { if (headRC[0] + c >= arena.displayRowsFrom + arena.tableRowNum) inRange = false; break; }
            case "left": { if (headRC[1] - c < arena.displayColsFrom) inRange = false; break; }
            case "right": { if (headRC[1] + c >= arena.displayColsFrom + arena.tableColNum) inRange = false; break; }
        }
        return inRange;
    }

    function checkIfBulletHits(c) {
        let bulletRowCol = [];
        switch (shootingDirection) {
            case "up": { bulletRowCol = [headRC[0] - c, headRC[1]]; break; }
            case "down": { bulletRowCol = [headRC[0] + c, headRC[1]]; break; }
            case "left": { bulletRowCol = [headRC[0], headRC[1] - c]; break; }
            case "right": { bulletRowCol = [headRC[0], headRC[1] + c]; break; }
        }
        if (arena.gameEntities[bulletRowCol[0]][bulletRowCol[1]]) {
            removeBullet();
        }
    }

    function removeBullet() {
        app.$entityBox.removeChild(svgBullet);
        arena.charIsShooting = false;
        clearInterval(shootTimer);
    }

    function shootFunction() {
        counter++;
        if (checkIfBulletIsStillInRange(counter)) { displayBullet(counter); checkIfBulletHits(counter) }
        else {
            removeBullet();
        }
    }

    const shootTimer = setInterval(() => shootFunction(), 20);
    shootFunction();
}



function collectCoin(entity, row, col) {
    arena.collectedCoins.push([row, col]);
    console.log(arena.collectedCoins);
    arena.gameEntities[row][col] = undefined;
    placeTableAndCharsOnMap();
    app[`$entity_${entity.id}`].style.display = "none";
    app.levelPoints.coins++;
    upDateStats("points");
}



function upDateStats(whatToUpdate) {
    // if what to update is not specified update all
    if (whatToUpdate === "level" || !whatToUpdate) app.$levelDisplay.innerHTML = app.currentLevel;
    if (whatToUpdate === "points" || !whatToUpdate) app.$pointDisplay.innerHTML = app.levelPoints.coins * 10; // changes!!!!!!!!!!!!
    if (whatToUpdate === "life" || !whatToUpdate) app.$lifeDisplay.innerHTML = arena.charLife;
    if (whatToUpdate === "bullets" || !whatToUpdate) {
        app.$bulletsDisplay.innerHTML = arena.charBullets;
        if (arena.charBullets <= 10) app.$bulletsDisplay.style.color = "yellow";
        else if (arena.charBullets <= 5) app.$bulletsDisplay.style.color = "red";
        else app.$bulletsDisplay.style.color = "";
    }
    if (whatToUpdate === "direction" || !whatToUpdate) app.$directionDisplay.innerHTML = arena.charDirection;
    if (whatToUpdate === "speed" || !whatToUpdate) app.$speedDisplay.innerHTML = arena.charSpeed;
}