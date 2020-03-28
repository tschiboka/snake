const $ = (selector, all = false) => all ? [...document.querySelectorAll(selector)] : document.querySelector(selector);

const app = {
    // DOM ELEMENTS
    $intro: $(".intro"),
    $mainMenu: $(".main-menu"),
    $gameBox: $(".game-box"),
    $control: $(".game-box__control"),
    // APP VARS
    introDuration: 1,
    loadLevelsState: "pending",
    currentLevel: 1,
    level: undefined,
    keyboard: false,
    gameTablePadding: 10,
    gameTableCellLength: 20,
};

const level = {};



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



function handleClickEvents(e) {
    // delegate all click events on body
    const origin = e.target.getAttribute("data-event");

    switch (origin) {
        case "start-btn": { startLevel(); }
    }
}



function handleResize() {
    app.$gameBox.removeChild($(".game-table"));
    buildTable();
}



function startGame() {
    app.$intro.style.display = "none";
    app.$mainMenu.style.display = "flex";

    $("body").addEventListener("click", e => handleClickEvents(e));
    window.addEventListener("resize", handleResize);
}



function startLevel() {
    app.$mainMenu.style.display = "none";
    app.$gameBox.style.display = "flex";
    if (app.keyboard) { app.$control.style.display = "none"; }
    console.log(app.$control);

    // assign current level to app obj
    app.level = app.levels[app.currentLevel - 1];

    buildTable();
}



function buildTable() {
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

    console.log(rowNum, colNum);
    // build table
    table.classList.add("game-table");
    for (let row = 0; row < rowNum; row++) {
        const row = document.createElement("tr");
        for (let cell = 0; cell < colNum; cell++) {
            const cell = document.createElement("td");
            row.appendChild(cell);
        }
        table.appendChild(row);
    }
    app.$gameBox.appendChild(table);
}