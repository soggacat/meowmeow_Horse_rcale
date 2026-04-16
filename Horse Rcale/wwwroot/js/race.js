let raceInterval = null;
const START_OFFSET = 20;
let FINISH_LINE = 480;

let capital = 100;
let currentBet = 0;
let selectedHorseId = null;
let selectedHorseName = null;
let selectedHorseOdds = null;
let reservedBet = 0;
let gameLocked = false;
let betPlaced = false;

let raceTick = 0;
let winnerHorseId = null;
let winnerFinishAt = Infinity;

const STAMINA_DRAIN_PER_TICK = 0.22;
const STAMINA_BOOST_AT_MAX = 1.0;
const HORSE_COLORS = ["#0f766e", "#f97316", "#3b82f6", "#e11d48", "#6366f1", "#22c55e"];

function getElement(id) {
    return document.getElementById(id);
}

function getHorseElements() {
    return Array.from(document.querySelectorAll(".race-lane .horse"));
}

function getHorseCards() {
    return Array.from(document.querySelectorAll(".horse-card.js-horse-pick"));
}

function getHorseColor(index) {
    return HORSE_COLORS[index % HORSE_COLORS.length];
}

function randomStat() {
    return Math.floor(Math.random() * 6) + 5;
}

function getNextHorseId() {
    const allIds = [
        ...getHorseCards().map(c => parseInt(c.dataset.id, 10)),
        ...getHorseElements().map(h => parseInt(h.dataset.id, 10))
    ].filter(Number.isFinite);

    return allIds.length ? Math.max(...allIds) + 1 : 1;
}

function getHorseNameById(id) {
    if (!id) return "None";
    const card = document.querySelector(`.horse-card.js-horse-pick[data-id="${id}"]`);
    if (card?.dataset?.name) return card.dataset.name;
    const horse = document.querySelector(`.race-lane .horse[data-id="${id}"]`);
    if (horse?.dataset?.name) return horse.dataset.name;
    return `Horse ${id}`;
}

function getHorseOddsById(id) {
    if (!id) return null;
    const card = document.querySelector(`.horse-card.js-horse-pick[data-id="${id}"]`);
    const lane = document.querySelector(`.race-lane .horse[data-id="${id}"]`);
    const raw = lane?.dataset?.odds ?? card?.dataset?.odds;
    if (raw === undefined || raw === null || raw === "") return null;
    const normalized = String(raw).trim().replace(",", ".");
    const num = parseFloat(normalized);
    return Number.isFinite(num) ? num : null;
}

function clearHorseHighlights() {
    document.querySelectorAll(".race-lane .horse.is-selected, .race-lane .horse.is-winner")
        .forEach(x => x.classList.remove("is-selected", "is-winner"));
    document.querySelectorAll(".horse-card.is-selected, .horse-card.is-winner")
        .forEach(x => x.classList.remove("is-selected", "is-winner"));
}

function setMessage(text, kind) {
    const msg = getElement("bet-message");
    if (!msg) return;
    msg.classList.remove("is-win", "is-lose", "is-info");
    if (kind) msg.classList.add(kind);
    msg.textContent = text;
}

function updateHorseCount() {
    const countEl = getElement("horses-count");
    if (countEl) countEl.textContent = String(getHorseCards().length);
}

function syncUI() {
    const capEl = getElement("capital");
    const betEl = getElement("bet");
    const selEl = getElement("selected-horse");

    if (capEl) capEl.textContent = String(capital);
    if (betEl) betEl.textContent = String(currentBet);
    if (selEl) selEl.textContent = selectedHorseId ? (selectedHorseName || getHorseNameById(selectedHorseId)) : "None";

    const hasHorses = getHorseElements().length > 0;
    const hasActiveRoundBet = betPlaced && reservedBet > 0;
    const isGameOver = capital <= 0 && !hasActiveRoundBet;
    const canInteract = hasHorses && !gameLocked && !isGameOver;
    const canBet = canInteract && !betPlaced;

    const betMinusBtn = getElement("bet-minus");
    const betPlusBtn = getElement("bet-plus");
    const allInBtn = getElement("bet-allin");
    const placeBtn = getElement("place-bet");
    const restartBtn = getElement("restart-game");
    const startRaceBtn = getElement("start-race-btn");
    const horseAddBtn = getElement("horse-add");
    const horseRemoveBtn = getElement("horse-remove");

    if (betMinusBtn) betMinusBtn.disabled = !canBet || currentBet <= 0;
    if (betPlusBtn) betPlusBtn.disabled = !canBet || currentBet >= capital;
    if (allInBtn) allInBtn.disabled = !canBet || capital <= 0;
    if (placeBtn) placeBtn.disabled = !(canInteract && currentBet > 0 && selectedHorseId && !betPlaced);
    if (startRaceBtn) startRaceBtn.disabled = !canInteract || !betPlaced;

    if (restartBtn) {
        restartBtn.hidden = !isGameOver;
        restartBtn.disabled = gameLocked && !isGameOver;
    }

    if (horseAddBtn) horseAddBtn.disabled = gameLocked || betPlaced;
    if (horseRemoveBtn) horseRemoveBtn.disabled = gameLocked || betPlaced || !hasHorses;

    if (isGameOver) {
        setMessage("Game Over. You are out of capital. Restart to play again.", "is-lose");
    }
}

function selectHorse(id) {
    if (gameLocked || capital <= 0 || betPlaced) return;

    if (selectedHorseId === String(id)) {
        selectedHorseId = null;
        selectedHorseName = null;
        selectedHorseOdds = null;
        document.querySelectorAll(".js-horse-select").forEach(cb => {
            cb.checked = false;
        });
    } else {
        selectedHorseId = String(id);
        selectedHorseName = getHorseNameById(id);
        selectedHorseOdds = getHorseOddsById(id);
        document.querySelectorAll(".js-horse-select").forEach(cb => {
            cb.checked = String(cb.dataset.id) === selectedHorseId;
        });
    }

    document.querySelectorAll(".race-lane .horse").forEach(h => {
        h.classList.toggle("is-selected", String(h.dataset.id) === selectedHorseId);
    });

    document.querySelectorAll(".horse-card.js-horse-pick").forEach(c => {
        c.classList.toggle("is-selected", String(c.dataset.id) === selectedHorseId);
    });

    if (selectedHorseId) {
        setMessage(`Selected: ${selectedHorseName}. Set your bet, then click Place Bet.`, "is-info");
    } else {
        setMessage("Select a horse from the list to begin.", "is-info");
    }

    syncUI();
}

function createHorseCard(horse, index) {
    const color = getHorseColor(index);
    const speedWidth = Math.max(0, Math.min(10, horse.speed)) * 10;
    const staminaWidth = Math.max(0, Math.min(10, horse.stamina)) * 10;
    const card = document.createElement("div");
    card.className = "horse-card js-horse-pick";
    card.dataset.id = String(horse.id);
    card.dataset.name = horse.name;
    card.dataset.odds = String(horse.odds);
    card.innerHTML = `
        <div class="horse-card-header">
            <label class="horse-select-checkbox">
                <input type="checkbox" class="js-horse-select" data-id="${horse.id}" data-name="${horse.name}">
                <span class="checkmark"></span>
            </label>
            <span class="horse-color-swatch" style="background-color:${color};"></span>
            <div class="horse-card-title">
                <div class="horse-name">${horse.name}</div>
                <div class="horse-meta">Speed: ${horse.speed} | Stamina: ${horse.stamina}</div>
            </div>
        </div>
        <div class="horse-stats">
            <div class="horse-stat">
                <span class="horse-stat-label">Speed</span>
                <div class="horse-stat-bar">
                    <div class="horse-stat-bar-fill speed" style="width:${speedWidth}%;"></div>
                </div>
            </div>
            <div class="horse-stat">
                <span class="horse-stat-label">Stamina</span>
                <div class="horse-stat-bar">
                    <div class="horse-stat-bar-fill stamina" style="width:${staminaWidth}%;"></div>
                </div>
            </div>
        </div>
    `;
    return card;
}

function createRaceLane(horse, index) {
    const color = getHorseColor(index);
    const lane = document.createElement("div");
    lane.className = "race-lane";
    lane.innerHTML = `
        <div class="race-lane-line"></div>
        <div class="horse"
             data-id="${horse.id}"
             data-name="${horse.name}"
             data-speed="${horse.speed}"
             data-stamina="${horse.stamina}"
             data-odds="${horse.odds}"
             style="--horse-color:${color};">
            <span class="horse-dot"></span>
            <span class="horse-label">${horse.name}</span>
        </div>
    `;
    return lane;
}

function ensureTrackLayout() {
    const track = document.querySelector(".race-track");
    if (!track) return null;

    let layout = track.querySelector(".race-track-layout");
    if (layout) return layout.querySelector(".race-track-lanes");

    track.innerHTML = `
        <div class="race-track-layout">
            <div class="race-track-labels">
                <span class="track-label track-label-start">START</span>
                <span class="track-label track-label-finish">FINISH</span>
            </div>
            <div class="race-track-lanes" id="race-track-lanes"></div>
        </div>
    `;

    return track.querySelector("#race-track-lanes");
}

function addHorse() {
    if (gameLocked || betPlaced) return;

    const horsesList = getElement("horses-list");
    if (!horsesList) return;

    const inputName = window.prompt("Enter horse name:");
    if (inputName === null) return;

    const trimmed = inputName.trim();
    if (!trimmed) return;

    const horse = {
        id: getNextHorseId(),
        name: trimmed,
        speed: randomStat(),
        stamina: randomStat(),
        odds: 2
    };

    const newIndex = getHorseCards().length;
    const emptyState = horsesList.querySelector(".empty-state");
    if (emptyState) emptyState.remove();

    horsesList.appendChild(createHorseCard(horse, newIndex));
    const lanes = ensureTrackLayout();
    if (lanes) lanes.appendChild(createRaceLane(horse, newIndex));

    updateHorseCount();
    syncUI();
}

function removeLastHorse() {
    if (gameLocked || betPlaced) return;

    const cards = getHorseCards();
    if (!cards.length) return;

    const lastCard = cards[cards.length - 1];
    const removedId = lastCard.dataset.id;
    lastCard.remove();

    const lanes = getElement("race-track-lanes");
    if (lanes && lanes.lastElementChild) {
        lanes.lastElementChild.remove();
    }

    if (selectedHorseId && String(selectedHorseId) === String(removedId)) {
        selectedHorseId = null;
        selectedHorseName = null;
        selectedHorseOdds = null;
        currentBet = 0;
    }

    if (!getHorseCards().length) {
        const horsesList = getElement("horses-list");
        if (horsesList) {
            const empty = document.createElement("p");
            empty.className = "empty-state";
            empty.textContent = "No horses yet. Choose a mode and create some to begin.";
            horsesList.appendChild(empty);
        }

        const track = document.querySelector(".race-track");
        if (track) {
            track.innerHTML = `<p class="empty-state">No horses available. Add some to start a race.</p>`;
        }
    }

    updateHorseCount();
    clearHorseHighlights();
    setMessage("Select a horse from the list to begin.", "is-info");
    syncUI();
}

function adjustBet(delta) {
    if (gameLocked || capital <= 0 || betPlaced) return;
    const next = Math.max(0, Math.min(capital, currentBet + delta));
    currentBet = Math.floor(next / 10) * 10;
    syncUI();
}

function allIn() {
    if (gameLocked || capital <= 0 || betPlaced) return;
    currentBet = capital;
    syncUI();
}

function placeBet() {
    if (gameLocked || betPlaced) return;
    if (capital <= 0) return syncUI();
    if (!selectedHorseId) return setMessage("Pick a horse first.", "is-info");
    if (currentBet <= 0) return setMessage("Bet must be greater than $0.", "is-info");
    if (currentBet > capital) currentBet = capital;

    selectedHorseOdds = getHorseOddsById(selectedHorseId);
    reservedBet = currentBet;
    betPlaced = true;
    capital -= reservedBet;

    clearHorseHighlights();
    document.querySelectorAll(".js-horse-select").forEach(cb => {
        cb.disabled = true;
    });

    setMessage(`Bet placed: $${reservedBet} on ${selectedHorseName}. Click Start Race to begin!`, "is-info");
    syncUI();
}

function startRace() {
    if (gameLocked) return;
    if (!betPlaced) {
        setMessage("Place your bet first!", "is-info");
        return syncUI();
    }

    gameLocked = true;
    syncUI();

    if (raceInterval !== null) return;

    const horses = document.querySelectorAll(".race-lane .horse");
    if (!horses.length) return;

    const firstLane = horses[0].parentElement;
    if (firstLane) {
        const laneWidth = firstLane.clientWidth || 520;
        FINISH_LINE = Math.max(START_OFFSET + 50, laneWidth - 40);
    }

    horses.forEach(h => {
        h.style.left = START_OFFSET + "px";
        h.dataset.finished = "false";
        h.dataset.currentStamina = h.dataset.stamina;
        h.dataset.finishAt = "";
    });

    raceTick = 0;
    winnerHorseId = null;
    winnerFinishAt = Infinity;
    raceInterval = setInterval(updateRace, 100);
}

function finishRound(winnerId) {
    const winnerName = getHorseNameById(winnerId);

    document.querySelectorAll(".race-lane .horse").forEach(h => {
        h.classList.toggle("is-winner", String(h.dataset.id) === String(winnerId));
        h.classList.remove("is-selected");
    });
    document.querySelectorAll(".horse-card.js-horse-pick").forEach(c => {
        c.classList.toggle("is-winner", String(c.dataset.id) === String(winnerId));
        c.classList.remove("is-selected");
    });

    const betIsActive = betPlaced && reservedBet > 0;
    const won = betIsActive && selectedHorseId && String(selectedHorseId) === String(winnerId);

    if (won) {
        const multiplier = (typeof selectedHorseOdds === "number" && Number.isFinite(selectedHorseOdds) && selectedHorseOdds > 0)
            ? selectedHorseOdds
            : 2;
        const winnings = reservedBet * multiplier;
        const profit = winnings - reservedBet;
        capital += winnings;
        const profitText = profit >= 0 ? `+$${profit}` : `-$${Math.abs(profit)}`;
        setMessage(`You WIN! Winner: ${winnerName}. ${profitText}`, "is-win");
    } else if (betIsActive) {
        setMessage(`You LOSE. Winner: ${winnerName}. -$${reservedBet}`, "is-lose");
    } else {
        setMessage(`Winner: ${winnerName}`, "is-info");
    }

    currentBet = 0;
    reservedBet = 0;
    selectedHorseId = null;
    selectedHorseName = null;
    selectedHorseOdds = null;
    betPlaced = false;
    gameLocked = false;

    document.querySelectorAll(".js-horse-select").forEach(cb => {
        cb.checked = false;
        cb.disabled = false;
    });

    syncUI();
}

function restartGame() {
    capital = 100;
    currentBet = 0;
    selectedHorseId = null;
    selectedHorseName = null;
    selectedHorseOdds = null;
    reservedBet = 0;
    betPlaced = false;
    gameLocked = false;
    clearHorseHighlights();

    document.querySelectorAll(".js-horse-select").forEach(cb => {
        cb.checked = false;
        cb.disabled = false;
    });

    setMessage("Select a horse from the list to begin.", "is-info");
    syncUI();
}

function updateRace() {
    const horses = Array.from(document.querySelectorAll(".race-lane .horse"));
    let finishedCount = 0;
    raceTick++;

    horses.forEach(horse => {
        if (horse.dataset.finished === "true") {
            finishedCount++;
            return;
        }

        const baseSpeed = parseInt(horse.dataset.speed, 10) || 5;
        const staminaMax = parseInt(horse.dataset.stamina, 10) || 5;
        let currentStamina = parseFloat(horse.dataset.currentStamina);
        if (Number.isNaN(currentStamina)) currentStamina = staminaMax;

        const drain = STAMINA_DRAIN_PER_TICK * (0.85 + 0.3 * (baseSpeed / 10));
        currentStamina = Math.max(0, currentStamina - drain);
        horse.dataset.currentStamina = String(currentStamina);

        const staminaRatio = staminaMax > 0 ? currentStamina / staminaMax : 0;
        const staminaBoost = (Math.min(Math.max(staminaMax, 0), 10) / 10) * STAMINA_BOOST_AT_MAX;
        const speedMultiplier = 1 + (staminaBoost * staminaRatio);
        const move = (baseSpeed * speedMultiplier) * (0.85 + 0.3 * Math.random());
        const actualMove = Math.max(0.35, move);

        const currentLeft = parseFloat(horse.style.left || START_OFFSET);
        let newLeft = currentLeft + actualMove;

        if (newLeft >= FINISH_LINE) {
            const remaining = Math.max(0, FINISH_LINE - currentLeft);
            const fraction = actualMove > 0 ? Math.min(1, remaining / actualMove) : 1;
            const finishAt = raceTick + fraction;

            newLeft = FINISH_LINE;
            horse.dataset.finished = "true";
            horse.dataset.finishAt = String(finishAt);
            finishedCount++;

            if (finishAt < winnerFinishAt) {
                winnerFinishAt = finishAt;
                winnerHorseId = horse.dataset.id;
            }
        }

        horse.style.left = `${newLeft}px`;
    });

    if (finishedCount === horses.length) {
        clearInterval(raceInterval);
        raceInterval = null;

        const winnerId = winnerHorseId || (() => {
            const finishers = horses
                .filter(h => h.dataset.finishAt)
                .map(h => ({ id: h.dataset.id, finishAt: parseFloat(h.dataset.finishAt) }))
                .filter(x => Number.isFinite(x.finishAt));
            if (!finishers.length) return null;
            finishers.sort((a, b) => a.finishAt - b.finishAt);
            return finishers[0]?.id || null;
        })();

        if (winnerId) finishRound(winnerId);
    }
}

function initHandlers() {
    const horsesList = getElement("horses-list");
    if (horsesList) {
        horsesList.addEventListener("change", (event) => {
            const target = event.target;
            if (!(target instanceof HTMLInputElement)) return;
            if (!target.classList.contains("js-horse-select")) return;
            if (target.checked) {
                selectHorse(target.dataset.id);
            } else if (selectedHorseId === String(target.dataset.id)) {
                selectedHorseId = null;
                selectedHorseName = null;
                selectedHorseOdds = null;
                setMessage("Select a horse from the list to begin.", "is-info");
                syncUI();
            }
        });
    }

    getElement("horse-add")?.addEventListener("click", addHorse);
    getElement("horse-remove")?.addEventListener("click", removeLastHorse);
    getElement("bet-minus")?.addEventListener("click", () => adjustBet(-10));
    getElement("bet-plus")?.addEventListener("click", () => adjustBet(10));
    getElement("bet-allin")?.addEventListener("click", allIn);
    getElement("place-bet")?.addEventListener("click", placeBet);
    getElement("start-race-btn")?.addEventListener("click", startRace);
    getElement("restart-game")?.addEventListener("click", restartGame);
}

document.addEventListener("DOMContentLoaded", () => {
    updateHorseCount();
    initHandlers();
    setMessage("Select a horse from the list to begin.", "is-info");
    syncUI();
});