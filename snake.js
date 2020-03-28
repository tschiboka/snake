const $ = (selector, all = false) => all ? [...document.querySelectorAll(selector)] : document.querySelector(selector);

const app = {
    // DOM ELEMENTS
    $intro: $(".intro"),
    $mainMenu: $(".main-menu"),
    $gameBox: $(".game-box"),
    // APP VARS
    introDuration: 1,
    loadLevelsState: "pending",
    currentLevel: 1,
    level: undefined,
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

    // assign current level to app obj
    app.level = app.levels[app.currentLevel - 1];

    buildTable();
}



function buildTable() {
    const maxDisplayableRows = Math.floor((window.innerHeight - 20 - (window.innerHeight / 10)) / 20);
    const maxDisplayableCols = Math.floor((window.innerWidth - 20) / 20);

    const rowNum = app.level.dimension[1] <= maxDisplayableRows ? app.level.dimension[1] : maxDisplayableRows;
    const colNum = app.level.dimension[0] <= maxDisplayableCols ? app.level.dimension[0] : maxDisplayableCols;

    // build table
    const table = document.createElement("table");
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