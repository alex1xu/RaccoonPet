const states = {
    RUN: "run",
    SIT: "sit",
    SLEEP: "sleep",
};

const screenWidth = window.innerWidth;

let currentState = null;
let stateTimeout = null;
let direction = 1;
let config = {};
let movementTimeout = null;

let trashCan = document.createElement("img");
let pizza = null;
let carryingPizza = false;

chrome.runtime.sendMessage({ type: "getConfig" }, (response) => {
    if (response) {
        config = response;
    }
});

const raccoon = document.createElement("img");
raccoon.style.position = "fixed";
raccoon.style.bottom = config.startY; // there is white space around the raccoon
raccoon.style.zIndex = "10000";
raccoon.style.pointerEvents = "none";
document.body.appendChild(raccoon);

trashCan.style.position = "fixed";
trashCan.style.bottom = "0px";
trashCan.style.left = `${0}px`;
trashCan.style.width = `40px`;
trashCan.style.pointerEvents = "none";
trashCan.src = chrome.runtime.getURL("sprites/trash.png");
document.body.appendChild(trashCan);

const sprites = {
    run: chrome.runtime.getURL("sprites/run.gif"),
    sit: chrome.runtime.getURL("sprites/sit2.gif"),
    lieDown: chrome.runtime.getURL("sprites/lie_down.gif"),
    sleep: [
        chrome.runtime.getURL("sprites/sleep1.gif"),
        chrome.runtime.getURL("sprites/sleep2.gif")
    ]
};

const getDistance = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);

chrome.runtime.sendMessage({ type: "getRaccoonState" }, (state) => {
    if (state) {
        raccoon.style.left = state.left || config.startX;
        raccoon.style.bottom = state.bottom || config.startY;
        changeState(state.state || states.RUN);
        direction = state.direction || 1;
        raccoon.style.transform = direction === -1 ? "scaleX(-1)" : "scaleX(1)";
    } else {
        raccoon.style.left = -200;
        raccoon.style.bottom = -200;
        changeState(states.RUN);
    }
});

const randomChoice = (choices) => choices[Math.floor(Math.random() * choices.length)];

const addVariability = () => {
    const rand = Math.random();
    return rand * config.durationVariability - (config.durationVariability / 2)
}

const changeState = (state) => {
    clearTimeout(stateTimeout);
    if (movementTimeout) clearTimeout(movementTimeout)
    currentState = state;
    saveRaccoonState();

    if (state === states.RUN) {
        raccoon.src = sprites.run;
        moveRaccoon();
        scheduleNextState(config.runDuration + addVariability());
    } else if (state === states.SIT) {
        raccoon.src = sprites.sit;
        scheduleNextState(config.sitDuration + addVariability());
    } else if (state === states.SLEEP) {
        raccoon.src = sprites.sleep[0];
        // raccoon.src = sprites.lieDown;
        alternateSleepFrames();
        scheduleNextState(config.sleepDuration + addVariability());
    }
    saveRaccoonState();
};

const scheduleNextState = (duration) => {
    stateTimeout = setTimeout(() => {
        const rand = Math.random();
        if (rand < config.probabilities.run) {
            changeState(states.RUN);
        } else if (rand < config.probabilities.run + config.probabilities.sit) {
            changeState(states.SIT);
        } else {
            changeState(states.SLEEP);
        }
    }, duration);
};

const saveRaccoonState = () => {
    chrome.runtime.sendMessage({
        type: "updateRaccoonState",
        data: {
            left: raccoon.style.left,
            bottom: raccoon.style.bottom,
            state: currentState,
            direction: direction,
        },
    });
};

const alternateSleepFrames = () => {
    if (currentState === states.SLEEP) {
        raccoon.src = raccoon.src === sprites.sleep[0] ? sprites.sleep[1] : sprites.sleep[0];
        setTimeout(alternateSleepFrames, 2000);
    }
};

const chooseNextState = () => {
    const rand = Math.random();
    if (rand < config.probabilities.run) {
        changeState(states.RUN);
    } else if (rand < config.probabilities.run + config.probabilities.sit) {
        changeState(states.SIT);
    } else {
        changeState(states.SLEEP);
    }
};

const moveRaccoon = () => {
    if (currentState === states.RUN) {
        let newPosition = parseInt(raccoon.style.left || 0) + (config.speed * direction);

        if (newPosition + config.raccoonWidth <= 0 || newPosition >= screenWidth - config.raccoonWidth)
            direction = -direction;

        updateRaccoonDirection();
        updateRaccoonPosition(newPosition);
        movementTimeout = setTimeout(moveRaccoon, config.movementRefreshRate);
    }
};

const moveToTarget = (targetX, callback) => {
    if (currentState === states.RUN) {
        const raccoonX = parseInt(raccoon.style.left || 0);
        const distance = targetX - raccoonX;

        direction = distance > 0 ? 1 : -1;
        updateRaccoonDirection();

        if (Math.abs(distance) > config.speed * 3) {
            updateRaccoonPosition(raccoonX + direction * config.speed * 2);
            movementTimeout = setTimeout(() => moveToTarget(targetX, callback), config.movementRefreshRate);
        } else {
            callback();
        }
    }
};

const updateRaccoonPosition = (newPosition) => {
    raccoon.style.left = `${newPosition}px`;
    saveRaccoonState();
};

const updateRaccoonDirection = () => {
    raccoon.style.transform = direction < 0 ? "scaleX(-1)" : "scaleX(1)";
};

const copyRaccoonPosition = (object) => {
    if (object) {
        object.style.left = raccoon.style.left;
        setTimeout(() => copyRaccoonPosition(object), config.movementRefreshRate)
    }
}

const moveToPizza = () => {
    const pizzaX = parseInt(pizza.style.left);
    moveToTarget(pizzaX, () => {
        carryingPizza = true;
        moveToTrashCan();
        setTimeout(() => copyRaccoonPosition(pizza), config.movementRefreshRate)
    });
};

const moveToTrashCan = () => {
    const trashCanX = parseInt(trashCan.style.left);
    moveToTarget(trashCanX, () => {
        carryingPizza = false;
        document.body.removeChild(pizza);
        pizza = null;
        chooseNextState();
    });
};

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !pizza) {
        pizza = createPizza();
        document.body.appendChild(pizza);

        changeState(states.RUN);
        moveToPizza();
    }
});

const createPizza = () => {
    const pizzaElement = document.createElement("img");
    pizzaElement.style.position = "fixed";
    pizzaElement.style.bottom = "0px";
    pizzaElement.style.zIndex = "1000";
    pizzaElement.style.pointerEvents = "none";
    pizzaElement.style.left = `${screenWidth / 4 + Math.random() * screenWidth / 2}px`;
    pizzaElement.style.width = `${config.pizzaSize || 30}px`;
    pizzaElement.src = chrome.runtime.getURL("sprites/pizza.png");
    return pizzaElement;
};

chooseNextState();