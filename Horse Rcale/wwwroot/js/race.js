let raceInterval = null;
const START_OFFSET = 20;
let FINISH_LINE = 480;

// ===== Betting game state =====
let capital = 100;
let currentBet = 0;
let selectedHorseId = null;
let selectedHorseName = null;
let selectedHorseOdds = null; // Odds multiplier (0/null should not auto-force a loss on win)
let reservedBet = 0;
let gameLocked = false;
let betPlaced = false;

// ===== Race result tracking =====
let raceTick = 0;
let winnerHorseId = null;
let winnerFinishAt = Infinity;

// ✅ Безопасная функция получения элемента
function getElement(id) {
    const el = document.getElementById(id);
    if (!el) {
        console.warn("⚠️ Элемент не найден:", id);
    }
    return el;
}

function getHorseElements() {
    return Array.from(document.querySelectorAll(".race-lane .horse"));
}

function getHorseNameById(id) {
    if (!id) return "None";

    let card = document.querySelector(`.horse-card.js-horse-pick[data-id="${id}"]`);
    if (card && card.dataset && card.dataset.name) {
        return card.dataset.name;
    }

    let horse = document.querySelector(`.race-lane .horse[data-id="${id}"]`);
    if (horse && horse.dataset && horse.dataset.name) {
        return horse.dataset.name;
    }

    return `Horse ${id}`;
}

function getHorseOddsById(id) {
    if (!id) return null;

    const card = document.querySelector(`.horse-card.js-horse-pick[data-id="${id}"]`);
    const lane = document.querySelector(`.race-lane .horse[data-id="${id}"]`);
    const raw = (lane && lane.dataset && lane.dataset.odds) ??
        (card && card.dataset && card.dataset.odds);

    if (raw === undefined || raw === null || raw === "") return null;

    // Normalize possible locale decimal commas (e.g. "0,5") into dot format.
    const normalized = String(raw).trim().replace(",", ".");
    const num = parseFloat(normalized);
    if (!Number.isFinite(num)) return null;
    return num;
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

function syncUI() {
    const capEl = getElement("capital");
    const betEl = getElement("bet");
    const selEl = getElement("selected-horse");

    if (capEl) capEl.textContent = String(capital);
    if (betEl) betEl.textContent = String(currentBet);

    if (selEl) {
        if (selectedHorseId) {
            selEl.textContent = selectedHorseName || getHorseNameById(selectedHorseId);
        } else {
            selEl.textContent = "None";
        }
    }

    const minusBtn = getElement("bet-minus");
    const plusBtn = getElement("bet-plus");
    const allInBtn = getElement("bet-allin");
    const placeBtn = getElement("place-bet");
    const restartBtn = getElement("restart-game");
    const startRaceBtn = getElement("start-race-btn");

    const hasHorses = getHorseElements().length > 0;
    const isGameOver = capital <= 0;
    const canInteract = hasHorses && !gameLocked && !isGameOver;
    const canBet = canInteract && !betPlaced;

    if (minusBtn) minusBtn.disabled = !canBet || currentBet <= 0;
    if (plusBtn) plusBtn.disabled = !canBet || currentBet >= capital;
    if (allInBtn) allInBtn.disabled = !canBet || capital <= 0;

    const canPlaceBet = canInteract && currentBet > 0 && selectedHorseId && !betPlaced;
    if (placeBtn) placeBtn.disabled = !canPlaceBet;

    if (startRaceBtn) startRaceBtn.disabled = !canInteract || !betPlaced;

    if (restartBtn) {
        restartBtn.hidden = !isGameOver;
        restartBtn.disabled = gameLocked && !isGameOver;
    }

    if (isGameOver) {
        setMessage("Game Over. You are out of capital. Restart to play again.", "is-lose");
    }
}

function selectHorse(id) {
    console.log("🎯 selectHorse вызван:", { id, type: typeof id });

    if (gameLocked || capital <= 0 || betPlaced) {
        console.warn("⛔ Выбор заблокирован:", { gameLocked, capital, betPlaced });
        return;
    }

    if (selectedHorseId === String(id)) {
        selectedHorseId = null;
        selectedHorseName = null;
        selectedHorseOdds = null;

        document.querySelectorAll(".js-horse-select").forEach(cb => {
            cb.checked = false;
        });
        console.log("✅ Выбор снят");
    } else {
        selectedHorseId = String(id);
        selectedHorseName = getHorseNameById(id);
        selectedHorseOdds = getHorseOddsById(id);

        console.log("✅ Лошадь выбрана:", { id, name: selectedHorseName });

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
    console.log("💰 placeBet вызван");

    if (gameLocked || betPlaced) {
        console.warn("⛔ Ставка уже сделана или игра заблокирована");
        return;
    }
    if (capital <= 0) {
        syncUI();
        return;
    }
    if (!selectedHorseId) {
        setMessage("Pick a horse first.", "is-info");
        syncUI();
        return;
    }
    if (currentBet <= 0) {
        setMessage("Bet must be greater than $0.", "is-info");
        syncUI();
        return;
    }
    if (currentBet > capital) {
        currentBet = capital;
    }

    // Capture odds at bet time so the outcome is based on the horse the user chose.
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
    console.log("🏁 startRace вызван");

    if (gameLocked) {
        console.warn("⛔ Игра уже идёт");
        return;
    }
    if (!betPlaced) {
        setMessage("Place your bet first!", "is-info");
        syncUI();
        return;
    }

    gameLocked = true;
    syncUI();

    if (raceInterval !== null) {
        console.warn("⚠️ Гонка уже идёт");
        return;
    }

    const horses = document.querySelectorAll(".race-lane .horse");
    if (horses.length === 0) {
        console.error("❌ Нет лошадей на треке");
        return;
    }

    console.log("🏁 startRace запущен, лошадей:", horses.length);

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

    console.log("=== Round settled ===", {
        winnerId,
        winnerName,
        selectedHorseId,
        selectedHorseOdds,
        betPlaced,
        reservedBet
    });

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
        // If odds are 0/null/invalid, we still treat it as a win.
        // Fallback multiplier matches the previous behavior (win doubled stake).
        const multiplier = (typeof selectedHorseOdds === "number" && Number.isFinite(selectedHorseOdds) && selectedHorseOdds > 0)
            ? selectedHorseOdds
            : 2;

        const winnings = reservedBet * multiplier; // Includes returning the stake at minimum.
        const profit = winnings - reservedBet; // Net change to the user's capital.
        capital += winnings;

        console.log("=== Bet settled ===", {
            won: true,
            multiplier,
            winnings,
            profit,
            capitalAfter: capital
        });

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

function initBettingUI() {
    console.log("🔧 initBettingUI запущен");

    // ✅ Получаем все кнопки с проверками
    const minusBtn = getElement("bet-minus");
    const plusBtn = getElement("bet-plus");
    const allInBtn = getElement("bet-allin");
    const placeBtn = getElement("place-bet");
    const restartBtn = getElement("restart-game");
    const startRaceBtn = getElement("start-race-btn");

    // ✅ Логируем что найдено
    console.log("🔘 Кнопки:", {
        minusBtn: minusBtn ? "OK" : "NOT FOUND",
        plusBtn: plusBtn ? "OK" : "NOT FOUND",
        allInBtn: allInBtn ? "OK" : "NOT FOUND",
        placeBtn: placeBtn ? "OK" : "NOT FOUND",
        restartBtn: restartBtn ? "OK" : "NOT FOUND",
        startRaceBtn: startRaceBtn ? "OK" : "NOT FOUND"
    });

    // ✅ Добавляем обработчики только если элементы существуют
    if (minusBtn) {
        minusBtn.addEventListener("click", () => adjustBet(-10));
    }
    if (plusBtn) {
        plusBtn.addEventListener("click", () => adjustBet(10));
    }
    if (allInBtn) {
        allInBtn.addEventListener("click", () => allIn());
    }
    if (placeBtn) {
        placeBtn.addEventListener("click", () => placeBet());
    }
    if (startRaceBtn) {
        startRaceBtn.addEventListener("click", () => startRace());
    }
    if (restartBtn) {
        restartBtn.addEventListener("click", () => restartGame());
    }

    // ✅ Обработка чекбоксов
    const checkboxes = document.querySelectorAll(".js-horse-select");
    console.log("☑️ Найдено чекбоксов:", checkboxes.length);

    checkboxes.forEach(cb => {
        console.log(`  - Checkbox ID: ${cb.dataset.id}, Name: ${cb.dataset.name}`);

        cb.addEventListener("change", (e) => {
            console.log("📝 Checkbox change:", {
                id: e.target.dataset.id,
                name: e.target.dataset.name,
                checked: e.target.checked
            });

            if (e.target.checked) {
                selectHorse(e.target.dataset.id);
            } else {
                if (selectedHorseId === String(e.target.dataset.id)) {
                    selectedHorseId = null;
                    selectedHorseName = null;
                    syncUI();
                    setMessage("Select a horse from the list to begin.", "is-info");
                }
            }
        });
    });

    setMessage("Select a horse from the list to begin.", "is-info");
    syncUI();
}

const STAMINA_DRAIN_PER_TICK = 0.22;
const STAMINA_BOOST_AT_MAX = 1.0;

function updateRace() {
    const horses = Array.from(document.querySelectorAll(".race-lane .horse"));
    let finishedCount = 0;

    raceTick++;

    horses.forEach(horse => {
        if (horse.dataset.finished === "true") {
            finishedCount++;
            return;
        }

        const baseSpeed = parseInt(horse.dataset.speed) || 5;
        const staminaMax = parseInt(horse.dataset.stamina) || 5;
        let currentStamina = parseFloat(horse.dataset.currentStamina);
        if (isNaN(currentStamina)) currentStamina = staminaMax;

        const drain = STAMINA_DRAIN_PER_TICK * (0.85 + 0.3 * (baseSpeed / 10));
        currentStamina = Math.max(0, currentStamina - drain);
        horse.dataset.currentStamina = currentStamina;

        const staminaRatio = staminaMax > 0 ? currentStamina / staminaMax : 0;
        const staminaBoost = (Math.min(Math.max(staminaMax, 0), 10) / 10) * STAMINA_BOOST_AT_MAX;
        const speedMultiplier = 1 + (staminaBoost * staminaRatio);

        const move = (baseSpeed * speedMultiplier) * (0.85 + 0.3 * Math.random());
        const actualMove = Math.max(0.35, move);

        let currentLeft = parseFloat(horse.style.left || START_OFFSET);
        let newLeft = currentLeft + actualMove;

        if (newLeft >= FINISH_LINE) {
            // Estimate a finish time within the current tick so ties don't default to DOM order.
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

        horse.style.left = newLeft + "px";
    });

    updateLog(horses);
    updateTopPanel(horses);

    if (finishedCount === horses.length) {
        clearInterval(raceInterval);
        raceInterval = null;

        const winnerId = winnerHorseId || (() => {
            const finishers = horses
                .filter(h => h.dataset.finishAt)
                .map(h => ({ id: h.dataset.id, finishAt: parseFloat(h.dataset.finishAt) }))
                .filter(x => Number.isFinite(x.finishAt));
            if (finishers.length === 0) return null;
            finishers.sort((a, b) => a.finishAt - b.finishAt); // earliest first
            return finishers[0]?.id || null;
        })();

        if (winnerId) finishRound(winnerId);
    }
}

function updateLog(horses) {
    const log = document.getElementById("log");
    if (!log) return;

    const sorted = [...horses].sort((a, b) => {
        const leftA = parseFloat(a.style.left || "0");
        const leftB = parseFloat(b.style.left || "0");
        if (leftA !== leftB) return leftA - leftB; // furthest back first

        // Tie-break by finish time so winner is not forced to DOM order.
        const finishA = parseFloat(a.dataset.finishAt || "Infinity");
        const finishB = parseFloat(b.dataset.finishAt || "Infinity");
        if (finishA !== finishB) return finishA - finishB; // earlier finish should rank higher

        return String(a.dataset.id).localeCompare(String(b.dataset.id));
    });

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

    const sorted = [...horses].sort((a, b) => {
        const leftA = parseFloat(a.style.left || "0");
        const leftB = parseFloat(b.style.left || "0");
        const leftDiff = leftB - leftA;
        if (leftDiff !== 0) return leftDiff; // furthest forward first

        // Tie-break by finish time so winner is consistent.
        const finishA = parseFloat(a.dataset.finishAt || "Infinity");
        const finishB = parseFloat(b.dataset.finishAt || "Infinity");
        const finishDiff = finishA - finishB; // earlier first
        if (finishDiff !== 0) return finishDiff;

        return String(a.dataset.id).localeCompare(String(b.dataset.id));
    });

    sorted.forEach((horse) => {
        const marker = document.createElement("div");
        marker.className = "top-horse";
        marker.textContent = horse.dataset.name;

        const rawLeft = parseFloat(horse.style.left || START_OFFSET);
        const clamped = Math.min(Math.max(rawLeft, START_OFFSET), FINISH_LINE);
        const progress = (clamped - START_OFFSET) / (FINISH_LINE - START_OFFSET);
        marker.style.left = (progress * 100) + "%";

        topTrack.appendChild(marker);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    console.log("📦 DOMContentLoaded, инициализация...");
    console.log("🐎 Лошадей на треке:", document.querySelectorAll(".race-lane .horse").length);
    console.log("🃏 Карточек лошадей:", document.querySelectorAll(".horse-card.js-horse-pick").length);
    console.log("☑️ Чекбоксов:", document.querySelectorAll(".js-horse-select").length);

    initBettingUI();
});