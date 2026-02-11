let raceInterval = null;
const START_OFFSET = 20;   // where horses visually start inside the lane
let FINISH_LINE = 480;     // will be recalculated from lane width on start

function startRace() {
    if (raceInterval !== null) return;

    const horses = document.querySelectorAll(".race-lane .horse");
    if (horses.length === 0) return;

    // вычисляем реальную длину трека по ширине дорожки
    const firstLane = horses[0].parentElement;
    if (firstLane) {
        const laneWidth = firstLane.clientWidth || 520;
        // немного отступаем от правого края, чтобы точка не упиралась в границу
        FINISH_LINE = Math.max(START_OFFSET + 50, laneWidth - 40);
    }

    horses.forEach(h => {
        // start slightly inside the left edge of the lane
        h.style.left = START_OFFSET + "px";
        h.dataset.finished = "false";
    });

    raceInterval = setInterval(updateRace, 100);
}

function updateRace() {
    const horses = Array.from(document.querySelectorAll(".horse"));
    let finishedCount = 0;

    horses.forEach(horse => {
        if (horse.dataset.finished === "true") {
            finishedCount++;
            return;
        }

        const speed = parseInt(horse.dataset.speed);
        const stamina = parseInt(horse.dataset.stamina);

        // формула движения
        let fatigue = Math.random() * stamina;
        let move = speed - fatigue;
        if (move < 1) move = 1;

        let currentLeft = parseFloat(horse.style.left || START_OFFSET);
        let newLeft = currentLeft + move;

        if (newLeft >= FINISH_LINE) {
            newLeft = FINISH_LINE;
            horse.dataset.finished = "true";
            finishedCount++;
        }

        horse.style.left = newLeft + "px";
    });

    updateLog(horses);
    updateTopPanel(horses);

    if (finishedCount === horses.length) {
        clearInterval(raceInterval);
        raceInterval = null;
    }
}

function updateLog(horses) {
    const log = document.getElementById("log");
    if (!log) return;

    // сортировка: от последнего к первому
    const sorted = [...horses].sort((a, b) =>
        parseFloat(a.style.left || "0") - parseFloat(b.style.left || "0")
    );

    log.innerHTML = "";

    sorted.forEach((horse, index) => {
        const li = document.createElement("li");
        const place = sorted.length - index;

        li.textContent = `${place} место — ${horse.dataset.name}`;
        log.appendChild(li);
    });
}

function updateTopPanel(horses) {
    const topTrack = document.getElementById("top-track");
    if (!topTrack) return;

    topTrack.innerHTML = "";

    // сортировка: от первого к последнему
    const sorted = [...horses].sort((a, b) =>
        parseFloat(b.style.left || "0") - parseFloat(a.style.left || "0")
    );

    sorted.forEach((horse, index) => {
        const marker = document.createElement("div");
        marker.className = "top-horse";
        marker.textContent = horse.dataset.name;

        // позиция маркера по фактическому прогрессу лошади
        const rawLeft = parseFloat(horse.style.left || START_OFFSET);
        const clamped = Math.min(Math.max(rawLeft, START_OFFSET), FINISH_LINE);
        const progress = (clamped - START_OFFSET) / (FINISH_LINE - START_OFFSET); // 0..1
        marker.style.left = (progress * 100) + "%";

        topTrack.appendChild(marker);
    });
}
