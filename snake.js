// HELPER FUNCTIONS
// get DOM elements
const $ = (selector, all = false) => all ? [...document.querySelectorAll(selector)] : document.querySelector(selector);

/*
    APP has a collection of properties that:
        - stores references to dom elements (less DOM traversing)
        - has values helping the navigation through the app
        - has values displaying the app general layout
        - has info about the app state of loading and settings
*/
const app = {
    // DOM ELEMENTS
    $intro: $(".intro"),
    $mainMenu: $(".main-menu"),
    $gameBox: $(".game-box"),
    $control: $(".game-box__control"),
    // APP VARS
    introDuration: 1,                                  // the intro animation in secs
    loadLevelsState: "pending",                        // if level JSON is loaded (pending | success | error)
    currentLevel: 1,                                   // default 1 unless local store has level stored
    level: undefined,                                  // level object is set later  
    keyboard: false,                                   // if player can interact with keyboard
    gameTablePadding: 10,                              // the padding around the game arena in px
    gameTableCellLength: 30,                           // the width and length of a single arena table cell in px
    interactionAllowed: false,                         // if player can interact with the game
};

/* 
    ARENA has a collection of properties that refers to any var thatvdirectly affecting
        - gameplay
        - interaction with the level map (arena) and display area (table)
    most values will be declared by different functions, but they are all declared for easier readability
*/
const arena = {
    focusX: undefined,                                 // the snakes heads X pos
    focusY: undefined,                                 // the snakes heads Y pos
    tableRowNum: undefined,                            // the displayable area expressed in table rows
    tableColNum: undefined,                            // the displayable area expressed in table columns
    centerHead: true,                                  // the first display tries to center map around characters head (focus point)
}



function start() {
    getLevels();
    setLevelNumFromLocalStorage();

    const introTimer = setInterval(() => {
        --app.introDuration;
        if (!app.introDuration) {
            clearInterval(introTimer);
            if (app.loadLevelsState === "success") startGame();
            else throw new Error("Levels have not been loaded yet ");
        }
    }, 1000);
}



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



function setLevelNumFromLocalStorage() {
    const storageLvl = localStorage.snake_level;
    if (!storageLvl) localStorage.setItem("snake_level", "1");
    else app.currentLevel = Number(localStorage.snake_level);
}



function handleClick(e) {
    // delegate all click events on body
    const origin = e.target.getAttribute("data-event");

    switch (origin) {
        case "start-btn": { startLevel(); break; }
    }
}



function handleResize() {
    app.$gameBox.removeChild($(".game-arena"));
    buildGameArena();
}



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



function startGame() {
    app.$intro.style.display = "none";
    app.$mainMenu.style.display = "flex";

    $("body").addEventListener("click", handleClick);
    document.addEventListener("keydown", handleKeypress)
    window.addEventListener("resize", handleResize);
}



function startLevel() {
    app.$mainMenu.style.display = "none";
    app.$gameBox.style.display = "flex";

    if (app.keyboard) { app.$control.style.display = "none"; }

    // assign current level to app obj
    app.level = app.levels[app.currentLevel - 1];

    arena.focusX = app.level.focus[0];
    arena.focusY = app.level.focus[1];
    arena.objects = app.level.objects;

    buildGameArena();
}



function buildGameArena() {
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



function placeObjectsInArena() {
    // temporary!!!!!!
    $(`#r${arena.focusY}c${arena.focusX}`).style.backgroundColor = "green";

    $(`#r${getTableCenterCoords().y}c${getTableCenterCoords().x}`).style.backgroundColor = "rgba(255, 30, 0, 0.1)";

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



const getTableCenterCoords = () => ({ x: Math.floor((arena.tableColNum - 1) / 2), y: Math.floor((arena.tableRowNum - 1) / 2) });



function moveFocusPoint(x, y) {
    arena.focusX += x;
    arena.focusY += y;

    placeObjectsInArena();
}