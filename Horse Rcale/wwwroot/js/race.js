let interval;

function startRace() {
    const horses = document.querySelectorAll(".horse");

    interval = setInterval(() => {
        horses.forEach(horse => {
            let speed = parseInt(horse.dataset.speed);
            let stamina = parseInt(horse.dataset.stamina);

            let fatigue = Math.random() * stamina;
            let move = speed - fatigue;

            if (move < 1) move = 1;

            let currentLeft = parseFloat(horse.style.left || 0);
            horse.style.left = (currentLeft + move) + "px";

            if (currentLeft >= 750) {
                clearInterval(interval);
            }
        });
    }, 100);
}