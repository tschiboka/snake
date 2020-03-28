const $ = (selector, all = false) => all ? [...document.querySelectorAll(selector)] : document.querySelector(selector);

const app = {
    $intro: $(".intro"),
    $mainMenu: $(".main-menu"),
    introDuration: 1,
    loadLevelsState: "pending",
};



function start() {
    getLevels();

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



function startGame() {
    app.$intro.style.display = "none";
    app.$mainMenu.style.display = "flex";

    $("body").addEventListener("click", e => handleClickEvents(e));
}



function handleClickEvents(e) {
    // delegate all click events on body
    const origin = e.target.getAttribute("data-event");

    switch (origin) {
        case "start-btn": console.log("HERE");
    }
}