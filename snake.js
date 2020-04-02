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
};

/* ARENA has a collection of properties that refers to any var that directly affecting
      - gameplay
      - interaction with the level map (arena) and display area (table)
    Most values will be declared by different game-play functions, but they are all defined here for easier readability
    (easier to look up and organize properties, values and their type (eg num, str))*/
const arena = {
    tableRowNum: undefined,                            // (+int) -> the displayable area expressed in table rows (coord)
    tableColNum: undefined,                            // (+int) -> the displayable area expressed in table columns (coord)
    prevTableMap: undefined,                           // (arr of str)  -> if previous table coord has entity on it ("010110") (avoiding unneccesary repainting)
    gameEntities: undefined,                           // (arr of objs) -> list of objects that appears on the game map
    entityColors: {                                    //     predifined list of the displayable colors -
        "charHead": "rgba(134, 155, 162, 0.2)",        //     defined here in order to save computations -
        "charBody": "rgba(134, 155, 162, 0.1)",        //     in 2d arr loop of displaying the table (can be > 1000s)
        "crosshair": "rgba(255, 255, 255, 0.03)",
        "wallBrick": "rgba(250, 150, 170, 0.3)",
    },
    parallaxCoefficient: 5,                            // (+int) -> game table background moves slower than the char (px)
    parralaxCenterRowCol: [0, 0],                      // (arr)  -> row and col of the center of the parallax bg when table is built
    charDirection: "",                                 // (str)  -> (up|down|left|right)
    brickColorSequence: [                              // (arr)  -> colors of random individual brick colors
        "#b3a432", "#9c8128", "#ab752b", "#d9a662",
        "#d99062", "#d97862", "#e35839", "#e33f39",
        "#c7221c", "#ed140c"
    ]
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
            case 38: { moveCharacter(-1, 0); break; }
            case 40: { moveCharacter(1, 0); break; }
            case 37: { moveCharacter(0, -1); break; }
            case 39: { moveCharacter(0, 1); break; }
            case 32: { console.log("SPACE"); }
        }

    }
}



/*##################################################################################################
  ###############################   FUNCTIONS FOR STARTING APP  ####################################
  ##################################################################################################*/



// Start of the application on body onload
function start() {
    getLevels();
    setLevelNumFromLocalStorage();

    // the timer responsible for animation at the start of the app
    const introTimer = setInterval(() => {
        --app.introDuration;
        if (!app.introDuration) {
            if (app.loadLevelsState === "success") {
                clearInterval(introTimer);
                startGame();
            }
            else if (app.loadLevelsState === "error") {
                clearInterval(introTimer);
                throw new Error("Levels couls not be loaded!");
            }
            else ++app.introDuration; // wait an other sec 
        }
    }, 1000);
}



// Load levels.json into app.levels, and set app.loadLevelState from "pending" to ("success" | "error")
async function getLevels() {
    try {
        const levelsJSON = await fetch("levels.json");
        const levels = await levelsJSON.json();
        app.loadLevelsState = "success";
        app.levels = levels;
    }
    catch (exp) {
        app.loadLevelsState = "error";
        throw new Error(exp);
    }
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
    //let entities = Array(app.level.dimension.rows).fill().map(() => Array(app.level.dimension.cols).fill());
    let entities = {};

    // objects in the map area
    obj.forEach(o => { entities[`r${o.row}c${o.col}`] = { type: o.type, model: o.model }; });

    // game character
    app.level.gameCharacterCoords.map((coord, i) => entities[`r${coord[0]}c${coord[1]}`] = { type: (i === 0 ? "charHead" : "charBody"), index: i });

    // walls have different set of colorSequence
    const createSequence = () => new Array(10).fill(1).map(n => n * Math.floor(Math.random() * 10));
    obj.forEach(o => { if (entities[`r${o.row}c${o.col}`].type === "wallBrick") { entities[`r${o.row}c${o.col}`].colorSequence = createSequence(); } });

    return entities;
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


    // create previous "busy" table map (first render all cells a bg)
    arena.prevTableMap = Array(maxDisplayableRows).fill(new Array(maxDisplayableCols + 1).join("1"));

    arena.charDirection = arena.charDirection || app.level.gameCharacterDirection;

    placeTableAtMap();
}



// function returns an arr of arr [[row, col], ...]
const findEntitiesRowColIfType = (type) => {
    const keys = Object.keys(arena.gameEntities).filter(k => arena.gameEntities[k].type === type);
    return keys.map(k => k.match(/\d+/g).map(Number));
}



// position the table on the board centering around the characters head where it's possible
function placeTableAtMap() {
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

    // clear entity divs
    app.$entityBox.innerHTML = "";

    for (let r = 0; r < arena.tableRowNum; r++) {
        for (let c = 0; c < arena.tableColNum; c++) {
            [rowOnMap, colOnMap] = [displayRowsFrom + r, displayColsFrom + c];
            clearDisplayTable(r, c);
            displayEntitiesOnTable(r, c, rowOnMap, colOnMap, characterAtRow, characterAtCol, tableCenRow, tableCenCol);
        }
    }
    app.gameTableIsDrawn = true;
    app.interactionAllowed = true;
}



// table repainting is optimised, so only the cells that were painted in the prev display are getting reset
function clearDisplayTable(row, col) {
    if (arena.prevTableMap[row][col] === "1") {
        arena[`$r${row}c${col}`].style.background = "transparent";
        arena.prevTableMap[row] = arena.prevTableMap[row].replaceAt(col, "0"); // clear prevTableMap
    }
}



// DOM call is only for elements that are being painted, color is declared globally to cut computation cost when rendering large tables 
function displayEntitiesOnTable(row, col, rowOnMap, colOnMap, characterAtRow, characterAtCol, tableCenRow, tableCenCol) {
    // set background colors
    let color = "", elem;
    const entity = arena.gameEntities[`r${rowOnMap}c${colOnMap}`];

    if (row === tableCenRow && col === tableCenCol) color = arena.entityColors.crosshair;
    if (entity) color = arena.entityColors[entity.type];
    if (rowOnMap === characterAtRow && colOnMap === characterAtCol) color = arena.entityColors.charHead;

    if (color) {
        elem = arena[`$r${row}c${col}`];
        elem.style.background = color;
        arena.prevTableMap[row] = arena.prevTableMap[row].replaceAt(col, "1"); // set prevTableMap
    }

    if (entity) {
        // find entity divs x, y position
        const [x, y] = [elem.offsetLeft, elem.offsetTop];
        const entityDiv = document.createElement("div");
        entityDiv.classList.add(`entity--${entity.type}`, "entity");
        entityDiv.style.top = y + "px";
        entityDiv.style.left = x + "px";
        entityDiv.style.width = app.gameTableCellLength + "px";
        entityDiv.style.height = app.gameTableCellLength + "px";

        switch (entity.type) {
            case "charBody": {
                const charLength = app.level.gameCharacterCoords.length;
                function transformBody(width, index) {
                    // last body parts are closer to the previous one
                    let addDistRowCol = [0, 0];
                    let coef = index === charLength - 1 ? 6 : entity.index === charLength - 2 ? 3 : 0;
                    if (index) {
                        addDistRowCol = findEntitiesRowColIfType("charBody")                            // get entities type char body
                            .map(rc => `r${rc[0]}c${rc[1]}`)                                            // get their ids
                            .filter(id => arena.gameEntities[id].index === index - 1)[0]                // find previous index id
                            .match(/\d+/g)                                                              // extract row col
                            .map((rc, i) => i === 0 ? (rc - rowOnMap) * coef : (rc - colOnMap) * coef); // get difference in col row
                    }

                    entityDiv.style.width = app.gameTableCellLength - width + "px";
                    entityDiv.style.height = app.gameTableCellLength - width + "px";
                    entityDiv.style.transform = `translate(${(width / 2) + addDistRowCol[1]}px, ${(width / 2) + addDistRowCol[0]}px)`;
                    entityDiv.style.WebkitTransform = `translate(${(width / 2) + addDistRowCol[1]}px, ${(width / 2) + addDistRowCol[0]}px)`;
                }

                if (entity.index === charLength - 1) { transformBody(8, entity.index); }
                else if (entity.index === charLength - 2) { transformBody(6, entity.index); }
                else if (entity.index === charLength - 3) { transformBody(4); }
                else { transformBody(2); }
                if (entity.index === 1) {
                    switch (arena.charDirection) {
                        case "left": { entityDiv.style.borderRadius = "0px 2px 2px 0px"; break; }
                        case "right": { entityDiv.style.borderRadius = "2px 0px 0px 2px"; break; }
                        case "up": { entityDiv.style.borderRadius = "0px 0px 2px 2px"; break; }
                        case "down": { entityDiv.style.borderRadius = "2px 2px 0px 0px"; }
                    }
                }

                entityDiv.style.backgroundColor = `rgba(200, 180, 255, ${0.6 - (entity.index / 20)})`;
                break;
            }
            case "charHead": {
                entityDiv.style.width = app.gameTableCellLength - 2 + "px";
                entityDiv.style.height = app.gameTableCellLength - 2 + "px";
                entityDiv.style.backgroundColor = "black";

                if (arena.charDirection === "left" || arena.charDirection === "right") {
                    entityDiv.style.transform = "translate(0px, 1px)";
                    entityDiv.style.WebkitTransform = "translate(0px, 1px)";
                }
                if (arena.charDirection === "up" || arena.charDirection === "down") {
                    entityDiv.style.transform = "translate(1px, 0px)";
                    entityDiv.style.WebkitTransform = "translate(1px, 0px)";
                }

                switch (arena.charDirection) {
                    case "left": { entityDiv.style.borderRadius = "7px 0px 0px 7px"; break; }
                    case "right": { entityDiv.style.borderRadius = "0px 7px 7px 0px"; break; }
                    case "up": { entityDiv.style.borderRadius = "7px 7px 0px 0px"; break; }
                    case "down": { entityDiv.style.borderRadius = "0px 0px 7px 7px"; }
                }

                // eyes
                function createEyes() {
                    const eyeCavity = document.createElement("div");
                    eyeCavity.classList.add("entity--charEyeCavity");
                    const eye = document.createElement("div");
                    eye.classList.add("entity--charEye");
                    eyeCavity.appendChild(eye);
                    return eyeCavity;
                }
                createEyes();

                const eye1 = createEyes();
                const eye2 = createEyes();

                // eyes are placed differently according to the move direction being horizontal or vertical
                if (arena.charDirection === "up" || arena.charDirection === "down") {
                    eye1.style.width = "50%"; eye1.style.height = "100%";
                    eye2.style.width = "50%"; eye2.style.height = "100%";
                }
                if (arena.charDirection === "left" || arena.charDirection === "right") {
                    eye1.style.width = "100%"; eye1.style.height = "50%";
                    eye2.style.width = "100%"; eye2.style.height = "50%";
                    entityDiv.style.flexDirection = "column";
                }

                entityDiv.appendChild(eye1);
                entityDiv.appendChild(eye2);
                break;
            }
            case "wallBrick": {
                const model = translateWallModelSyntax(entity.model);
                switch (model) {
                    case "ver": { drawSingleVerticalBrickWall(entityDiv, entity); break; }
                } // end of switch entity model
                break;
            }
        } // end of switch entity type

        app.$entityBox.appendChild(entityDiv);
    }
}



function moveCharacter(row, col) {
    // check if next move is in maps range or collides into other entity
    let outOfRange = collides = false;
    const characterCoords = [...findEntitiesRowColIfType("charHead").concat(findEntitiesRowColIfType("charBody"))]; // loose reference
    if (characterCoords[0][0] + row < 0 || characterCoords[0][1] + col < 0) outOfRange = true;
    if (characterCoords[0][0] + row > app.level.dimension.rows - 1 || characterCoords[0][1] + col > app.level.dimension.cols - 1) outOfRange = true;
    if (arena.gameEntities[`r${characterCoords[0][0] + row}c${characterCoords[0][1] + col}`]) collides = true;
    if (outOfRange || collides) return void (0);

    // copy objs & delete character from entities obj
    const characterObjCopys = []
    characterCoords.forEach(coords => {
        characterObjCopys.push(arena.gameEntities[`r${coords[0]}c${coords[1]}`]);
        delete arena.gameEntities[`r${coords[0]}c${coords[1]}`];
    });
    characterObjCopys.sort((a, b) => a.index - b.index);

    // calculate new positions
    arena.gameEntities[`r${characterCoords[0][0] + row}c${characterCoords[0][1] + col}`] = characterObjCopys[0];
    characterCoords.pop();
    if (characterObjCopys.length > 1) {
        characterCoords.forEach((coords, i) => { arena.gameEntities[`r${coords[0]}c${coords[1]}`] = characterObjCopys[i + 1]; });
    }

    // direction must be determined if movement doesn't end with collision
    switch ("" + row + col) {
        case "-10": { arena.charDirection = "up"; break; }
        case "10": { arena.charDirection = "down"; break; }
        case "0-1": { arena.charDirection = "left"; break; }
        case "01": { arena.charDirection = "right"; }
    }

    placeTableAtMap();
}



/*##################################################################################################
  ###################################  SVG DRAWING FUNCTIONS  ######################################
  ##################################################################################################*/


/*  Wall model naming syntax: (DIRECTION, LENGTH, START_JOINT, END_JOINT) eg: H5.LNC.TSONE
    DIRECTION: (H|V) - horizontal / vertical
    LENGTH: (+int && pos + int <= map size)
    JOINTS: (joint type, direction, isOpen)
        joint type: (L|T|X|C|O) L shape / T shape / + shape / closed / open (X does not need direction)
        joint direction: (N|E|S|W) north, east, south, west (closed does not need direction)
        H3.TOSW.XC eg horizontal wall of length 3 starts with a T shaped joint open in South 
                      and West and ends in a + shaped joint closed in all direction
*/
function translateWallModelSyntax(modelStr) {
    const model = {
        direction: "",
        length: 1,
        singleBlock: false,              // is a single brick
        singleBlockOpenSides: undefined, // [N, E, S, W]
    };
    const chunks = modelStr.toUpperCase().split(".");

    if (chunks.length < 2) throw new Error("Wall Error: Badly separated model expression!" + modelStr);

    // get direction
    if (chunks[0][0] !== "H" && chunks[0][0] !== "V") throw new Error("Wall Model: First character must be V or H!" + modelStr);
    model.direction = chunks[0][0] === "H" ? "horizontal" : "vertical";

    console.log(chunks[0][1])
    // get length
    if (chunks[0][1] < 1) throw new Error("Wall Model: length must be greater than 0!" + modelStr);
    if (isNaN(chunks[0][1])) throw new Error("Wall Model: Second character must be a number!" + modelStr);
    // if length is 1
    else if (chunks[0][1] == 1) {
        // if only joint is C
        if (chunks[1].length === 1 && chunks[1][0] === "C") {
            model.singleBlock = true;
            model.singleBlockOpenSides = [0, 0, 0, 0];
        }
        else if (chunks[1].match(/^[OC]{4}$/g)) {
            model.singleBlock = true;
            model.singleBlockOpenSides = [...chunks[1]].map(ch => ch === "C" ? 0 : 1);
        }
        else if (chunks[1].length !== 4) throw new Error("Wall Model: illegal property for character with length 1." + modelStr);
    }
    return model;
}



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



const getBrickColor = (n, e) => arena.brickColorSequence[e.colorSequence[n % arena.brickColorSequence.length]];



function drawSingleVerticalBrickWall(div, entity, model) {
    const l = app.gameTableCellLength;
    const svg = createSvg({ width: l, height: l });

    const rect = svgDraw(
        "rect",
        {
            x: 0, y: 0, width: l - 1, height: l - 1,
            stroke: "rgba(255, 255, 255, 0.2)", fill: "transparent"
        });
    const vLine1 = svgDraw("line", {
        x1: l / 3, y1: 1, x2: l / 3, y2: l - 1,
        stroke: "rgba(255, 255, 255, 0.2)", "stroke-width": 1, fill: "transparent"
    });
    const vLine2 = svgDraw("line", {
        x1: l / 3 * 2, y1: 1, x2: l / 3 * 2, y2: l - 1,
        stroke: "rgba(255, 255, 255, 0.2)", "stroke-width": 1, fill: "transparent"
    });
    const hLine1 = svgDraw("line", {
        x1: 0, y1: l / 2, x2: l / 3, y2: l / 2,
        stroke: "rgba(255, 255, 255, 0.2)", "stroke-width": 1, fill: "transparent"
    });
    const hLine2 = svgDraw("line", {
        x1: l / 3 * 2, y1: l / 2, x2: l, y2: l / 2,
        stroke: "rgba(255, 255, 255, 0.2)", "stroke-width": 1, fill: "transparent"
    });

    svg.appendChild(rect);
    svg.appendChild(vLine1);
    svg.appendChild(vLine2);
    svg.appendChild(hLine1);
    svg.appendChild(hLine2);
    div.appendChild(svg);
}