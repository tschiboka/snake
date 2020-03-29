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
    keyboard: false,                                   // (flag) -> if player can interact with keyboard eg mobile
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
    focusX: undefined,                                 // (+int) -> the display areas center X pos, floored (coord) 
    focusY: undefined,                                 // (+int) -> the display areas center Y pos, floored (coord)
    tableRowNum: undefined,                            // (+int) -> the displayable area expressed in table rows (coord)
    tableColNum: undefined,                            // (+int) -> the displayable area expressed in table columns (coord)
    centerHead: true,                                  // (flag) -> the first display tries to center map around characters head (focus point)
    objects: undefined,                                // (arr of objs) -> list of objects that appears on the game map
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
    buildGameDisplayableArea();
}



// Keypresses are delegated from the entire document, and blocked (or behave differently) when 
// user can interact with the game. (game has started and still actively going)
function handleKeypress(e) {
    if (app.interactionAllowed) {
        switch (e.keyCode) {
            case 38: { console.log("UP"); moveFocusPoint(0, -1); break; }
            case 40: { console.log("DOWN"); moveFocusPoint(0, 1); break; }
            case 37: { console.log("LEFT"); moveFocusPoint(-1, 0); break; }
            case 39: { console.log("RIGHT"); moveFocusPoint(1, 0); break; }
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

    arena.objects = app.level.objects;

    buildGameDisplayableArea();
}



/*##################################################################################################
  #####################################   GAME-PLAY FUNCTIONS  #####################################
  ##################################################################################################*/



// Build a table that displays the level map (or most cases a segment of it), and scale it to the 
// space currently available in the browser window.
function buildGameDisplayableArea() {
    if (app.level.dimension[0] < 10 | app.level.dimension[1] < 10) throw new RangeError(`Level dimension must be min 10x10!\nCurrent dimension on level ${app.currentLevel} is ${app.level.dimension[0]}x${app.level.dimension[1]}.`)
    const height = window.innerHeight;
    const width = window.innerWidth;
    const gameHeight = height - (app.gameTablePadding * 2);
    const gameWidth = width - (app.gameTablePadding * 2);
    const navSpace = app.keyboard ? gameHeight * 0.1 : gameHeight * 0.2; // space for displaying points and navigation etc.
    const maxDisplayableRows = Math.floor((gameHeight - navSpace) / app.gameTableCellLength);
    const maxDisplayableCols = Math.floor(gameWidth / app.gameTableCellLength);
    const rowNum = app.level.dimension[1] <= maxDisplayableRows ? app.level.dimension[1] : maxDisplayableRows;
    const colNum = app.level.dimension[0] <= maxDisplayableCols ? app.level.dimension[0] : maxDisplayableCols;
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

    placeObjectsInArena();
}



// Display all objects provided by the actual level on the game table.
function placeObjectsInArena() {
    if (arena.centerHead) centerDisplayAreaToCenterCharacterHead();
    // temporary!!!!!!
    //$(`#r${arena.focusY}c${arena.focusX}`).style.backgroundColor = "green";

    //$(`#r${getTableCenterCoords().y}c${getTableCenterCoords().x}`).style.backgroundColor = "rgba(255, 30, 0, 0.1)";

    for (let r = 0; r < arena.tableRowNum; r++) {
        for (let c = 0; c < arena.tableColNum; c++) {
            try {

                $(`#r${r}c${c}`).title = r + "," + c;
            }
            catch (err) { console.log(r, c); }
        }
    }

    arena.objects.map(obj => {
        switch (obj.type) {
            case "wall": {

                break;
            }
        }
    });

    app.interactionAllowed = true;
}



// Head should be at the center of the display table at the begining of the level.
// If head would be out of the range of level map, set focus as close to the edges as possible.
// eg: focusX can't be -1 or larger than maps max column num. 
function centerDisplayAreaToCenterCharacterHead() {
    let arenaMapCrosshairX = app.level.characterHeadAt[1];
    let arenaMapCrosshairY = app.level.characterHeadAt[0];

    if (arenaMapCrosshairX < 0 || arenaMapCrosshairY < 0) throw new RangeError(`Variables below can not have negative values! \narenaMapCrosshairX: ${arenaMapCrosshairX}, arenaMapCrosshairY: ${arenaMapCrosshairY}`);

    // check if display table is in range

    getTableDistancePoints();
}




// Returns an obj with the display tables center x, y coords (eg: 10x10 -> x:4, y:4, 11x11 -> x:5, y:5) 
const getTableDistancePoints = () => {
    const centerX = Math.floor((arena.tableColNum - 1) / 2);
    const centerY = Math.floor((arena.tableRowNum - 1) / 2);
    const distRight = arena.tableColNum - 1 - centerX;
    const distLeft = arena.tableColNum - 1 - distRight;
    const distBottom = arena.tableRowNum - 1 - centerY;
    const distTop = arena.tableRowNum - 1 - distBottom;
    console.log(centerX, centerY);
    console.log(distLeft, distRight);
    console.log(distTop, distBottom);
}



function moveFocusPoint(x, y) {
    arena.focusX += x;
    arena.focusY += y;

    placeObjectsInArena();
}