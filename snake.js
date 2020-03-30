/*##################################################################################################
  #################################   VARIABLE DECTALRATIONS  ######################################
  ##################################################################################################*/

// HELPER FUNCTIONS

// Get DOM elements
const $ = (selector, all = false) => all ? [...document.querySelectorAll(selector)] : document.querySelector(selector);

/*APP has a collection of properties that:
    - stores references to dom elements (less DOM traversing)
    - has values helping the navigation through the app
    - has values displaying the app general layout
    - has info about the app state of loading and settings*/
const app = {
    // DOM ELEMENTS all (prefixed with $)
    $intro: $(".intro"),                               // intros wrapping div
    $mainMenu: $(".main-menu"),                        // main menu
    $gameBox: $(".game-box"),                          // games div (stats, game, ?constrol for mobile)
    $control: $(".game-box__control"),                 // holds control btns (eg for mobile game-play)

    // APP VARS
    introDuration: 1,                                  // (+int) -> the intro animation in secs
    loadLevelsState: "pending",                        // ("pending" | "success" | "error") -> if level JSON is loaded
    currentLevel: 1,                                   // (+int) -> default 1 unless local store has level stored
    level: undefined,                                  // (obj)  -> level object is loaded later  
    keyboard: true,                                    // (flag) -> if player can interact with keyboard eg mobile
    gameTablePadding: 10,                              // (+int) -> the padding around the game arena in px
    gameTableCellLength: 30,                           // (+int) -> the width and length of a single arena table cell in px
    interactionAllowed: false,                         // (flag) -> if player can interact with the game
};

/* ARENA has a collection of properties that refers to any var that directly affecting
      - gameplay
      - interaction with the level map (arena) and display area (table)
    Most values will be declared by different game-play functions, but they are all defined here for easier readability
    (easier to look up and organize properties, values and their type (eg num, str))*/
const arena = {
    crossHairRow: undefined,                           // (+int) -> the x coord on the map where display is centered
    crossHairCol: undefined,                           // (+int) -> the x coord on the map where display is centered
    tableRowNum: undefined,                            // (+int) -> the displayable area expressed in table rows (coord)
    tableColNum: undefined,                            // (+int) -> the displayable area expressed in table columns (coord)
    gameEntities: undefined,                           // (arr of objs) -> list of objects that appears on the game map
    gameCharacterCoords: undefined,                    // (arr of arr) -> the characters coord list
}



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
    app.$gameBox.removeChild($(".game-arena"));
    buildGameTableArea();
    placeTableAtMap();
}



// Keypresses are delegated from the entire document, and blocked (or behave differently) when 
// user can interact with the game. (game has started and still actively going)
function handleKeypress(e) {
    if (app.interactionAllowed) {
        switch (e.keyCode) {
            case 38: { console.log("UP"); moveCharacter(0, -1); break; }
            case 40: { console.log("DOWN"); moveCharacter(0, 1); break; }
            case 37: { console.log("LEFT"); moveCharacter(-1, 0); break; }
            case 39: { console.log("RIGHT"); moveCharacter(1, 0); break; }
            case 32: { console.log("SPACE"); break; }
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
            clearInterval(introTimer);
            if (app.loadLevelsState === "success") startGame();
            else throw new Error("Levels have not been loaded yet ");
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
    app.$gameBox.style.display = "flex";

    if (app.keyboard) { app.$control.style.display = "none"; }

    // assign current level to app obj
    app.level = app.levels[app.currentLevel - 1];

    arena.gameEntities = createGameArenaObjectArr(app.level.objects);

    buildGameTableArea();
}



function createGameArenaObjectArr(obj) {
    // create an emtpty 2D array
    let entities = Array(app.level.dimension.rows).fill().map(() => Array(app.level.dimension.cols).fill());

    // objects in the map area
    obj.forEach(o => { entities[o.row][o.col] = o; });

    // game character
    arena.gameCharacterCoords = app.level.gameCharacterCoords;
    arena.gameCharacterCoords.map(coord => entities[coord[0]][coord[1]] = coord);

    return entities;
}



/*##################################################################################################
  ##############################   BUILD GAMETABLE & POSITIONING  ##################################
  ##################################################################################################*/



// Build a table that displays the level map (or most cases a segment of it), and scale it to the 
// space currently available in the browser window.
function buildGameTableArea() {
    if (app.level.dimension.cols < 10 | app.level.dimension.rows < 10) throw new RangeError(`Level dimension must be min 10x10!\nCurrent dimension on level ${app.currentLevel} is ${app.level.dimension.cols}x${app.level.dimension.rows}.`)
    const height = window.innerHeight;
    const width = window.innerWidth;
    const gameHeight = height - (app.gameTablePadding * 2);
    const gameWidth = width - (app.gameTablePadding * 2);
    const navSpace = app.keyboard ? gameHeight * 0.1 : gameHeight * 0.2; // space for displaying points and navigation etc.
    const maxDisplayableRows = Math.floor((gameHeight - navSpace) / app.gameTableCellLength);
    const maxDisplayableCols = Math.floor(gameWidth / app.gameTableCellLength);
    const rowNum = app.level.dimension.rows <= maxDisplayableRows ? app.level.dimension.rows : maxDisplayableRows;
    const colNum = app.level.dimension.cols <= maxDisplayableCols ? app.level.dimension.cols : maxDisplayableCols;
    const table = document.createElement("table");

    $(".game-box__stats, .game-box__control", true).map(elem => elem.style.height = Math.floor(gameHeight / 10) + "px");

    table.classList.add("game-arena");
    for (let r = 0; r < rowNum; r++) {
        const row = document.createElement("tr");
        for (let c = 0; c < colNum; c++) {
            const cell = document.createElement("td");
            cell.id = `r${r}c${c}`;
            row.appendChild(cell);
        }
        table.style.width = colNum * app.gameTableCellLength + "px";
        table.style.height = rowNum * app.gameTableCellLength + "px";
        table.appendChild(row);
    }
    app.$gameBox.appendChild(table);

    arena.tableRowNum = rowNum;
    arena.tableColNum = colNum;

    placeTableAtMap();
}



function placeTableAtMap() {
    const tableCenRow = Math.floor((arena.tableRowNum - 1) / 2);
    const tableCenCol = Math.floor((arena.tableColNum - 1) / 2);
    let [characterAtRow, characterAtCol] = arena.gameCharacterCoords[0];

    // keep character in range
    if (characterAtRow < 0) arena.gameCharacterCoords[0][0] = characterAtRow = 0;
    if (characterAtCol < 0) arena.gameCharacterCoords[0][1] = characterAtCol = 0;
    if (characterAtRow > app.level.dimension.rows - 1) arena.gameCharacterCoords[0][0] = characterAtRow = app.level.dimension.rows - 1;
    if (characterAtCol > app.level.dimension.cols - 1) arena.gameCharacterCoords[0][1] = characterAtCol = app.level.dimension.cols - 1;

    let displayRowsFrom = characterAtRow - tableCenRow;
    let displayColsFrom = characterAtCol - tableCenCol;

    // keep display table in range
    if (characterAtRow - tableCenRow < 0) displayRowsFrom = 0;
    if (characterAtCol - tableCenCol < 0) displayColsFrom = 0;
    if (displayRowsFrom + arena.tableRowNum - app.level.dimension.rows > 0) displayRowsFrom = app.level.dimension.rows - arena.tableRowNum;
    if (displayColsFrom + arena.tableColNum - app.level.dimension.cols > 0) displayColsFrom = app.level.dimension.cols - arena.tableColNum;

    for (let r = 0; r < arena.tableRowNum; r++) {
        for (let c = 0; c < arena.tableColNum; c++) {
            [rowOnMap, colOnMap] = [displayRowsFrom + r, displayColsFrom + c];
            $(`#r${r}c${c}`).style.background = "transparent";

            if (rowOnMap === characterAtRow && colOnMap === characterAtCol) $(`#r${r}c${c}`).style.background = "blue";
            if (rowOnMap === 1 && colOnMap === 1) $(`#r${r}c${c}`).style.background = "red";
        }
    }

    $(`#r${tableCenRow}c${tableCenCol}`).style.color = "deeppink";

    app.interactionAllowed = true;
}



function moveCharacter(col, row) {
    arena.gameCharacterCoords[0][0] += row;
    arena.gameCharacterCoords[0][1] += col;

    placeTableAtMap();
}