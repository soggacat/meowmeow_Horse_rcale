let raceInterval = null;
window.__raceRunning = false;
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
        h.style.left = START_OFFSET + "px";
        h.dataset.finished = "false";
        // current stamina starts at max; drains over time during the race
        h.dataset.currentStamina = h.dataset.stamina;
    });

    raceInterval = setInterval(updateRace, 100);
    window.__raceRunning = true;
}

const STAMINA_DRAIN_PER_TICK = 0.22; // how much stamina drops each 100ms (tune feel here)
const STAMINA_BOOST_AT_MAX = 1.0;    // at stamina=10 and full stamina, speed can be up to base*(1+1.0)=2x

function updateRace() {
    const horses = Array.from(document.querySelectorAll(".race-lane .horse"));
    let finishedCount = 0;

    horses.forEach(horse => {
        if (horse.dataset.finished === "true") {
            finishedCount++;
            return;
        }

        // Speed is the BASE speed (when stamina is empty).
        // Stamina provides a temporary multiplier that fades as stamina drains.
        const baseSpeed = parseInt(horse.dataset.speed) || 5;
        const staminaMax = parseInt(horse.dataset.stamina) || 5;
        let currentStamina = parseFloat(horse.dataset.currentStamina);
        if (isNaN(currentStamina)) currentStamina = staminaMax;

        // Drain stamina over time; slightly faster burn for higher baseSpeed.
        const drain = STAMINA_DRAIN_PER_TICK * (0.85 + 0.3 * (baseSpeed / 10));
        currentStamina = Math.max(0, currentStamina - drain);
        horse.dataset.currentStamina = currentStamina;

        // Effective speed:
        // - At 0 stamina -> baseSpeed
        // - At full stamina -> baseSpeed * (1 + staminaBoost), where staminaBoost grows with staminaMax
        const staminaRatio = staminaMax > 0 ? currentStamina / staminaMax : 0;
        const staminaBoost = (Math.min(Math.max(staminaMax, 0), 10) / 10) * STAMINA_BOOST_AT_MAX;
        const speedMultiplier = 1 + (staminaBoost * staminaRatio);

        const move = (baseSpeed * speedMultiplier) * (0.85 + 0.3 * Math.random());
        const actualMove = Math.max(0.35, move);

        let currentLeft = parseFloat(horse.style.left || START_OFFSET);
        let newLeft = currentLeft + actualMove;

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
        window.__raceRunning = false;
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
