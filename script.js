const states = {
    RUN: "run",
    SIT: "sit",
    SLEEP: "sleep"
};

const screenWidth = window.innerWidth;

let currentState = null;
let stateTimeout = null;
let direction = 1;
let config = {};

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

const sprites = {
    run: chrome.runtime.getURL("sprites/run.gif"),
    sit: chrome.runtime.getURL("sprites/sit2.gif"),
    lieDown: chrome.runtime.getURL("sprites/lie_down.gif"),
    sleep: [
        chrome.runtime.getURL("sprites/sleep1.gif"),
        chrome.runtime.getURL("sprites/sleep2.gif")
    ]
};

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

        if (newPosition + config.raccoonWidth <= 0 || newPosition >= screenWidth - config.raccoonWidth) {
            direction = -direction;
        }

        if (direction < 0) {
            raccoon.style.transform = "scaleX(-1)";
        } else {
            raccoon.style.transform = "scaleX(1)";
        }

        raccoon.style.left = newPosition + "px";
        setTimeout(moveRaccoon, 10)
        saveRaccoonState();
    }
};

chooseNextState();