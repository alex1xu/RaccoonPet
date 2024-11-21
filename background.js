let config = {};

fetch(chrome.runtime.getURL("config.json"))
    .then((response) => response.json())
    .then((data) => {
        config = data;
    })
    .catch((error) => console.error("Failed to load configuration:", error));

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "getConfig") {
        sendResponse(config);
    }
});

let raccoonState = {
    left: config.startX,
    bottom: config.startY,
    state: "run",
    direction: 1,
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "updateRaccoonState") {
        raccoonState = { ...raccoonState, ...message.data };
        chrome.storage.local.set({ raccoonState });
    } else if (message.type === "getRaccoonState") {
        sendResponse(raccoonState);
    }
});