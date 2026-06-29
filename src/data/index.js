export const DICTIONARIES = [
    { name: 'names', key: 'n', default: true },
    { name: 'emails', key: 'e', default: true },
    { name: 'texts', key: 't', default: true },
    { name: 'descriptions', key: 'd', default: false },
    { name: 'movie_titles', key: 'f', default: false },
    { name: 'movie_descriptions', key: 'p', default: false },
    { name: 'wikipedia', key: 'w', default: false },
    { name: 'chat_messages', key: 'm', default: false }
];

import * as dictionaries from "./dictionaries.js";

export async function fetchData() {
    const data = DICTIONARIES.reduce((acc, { name }) => {
        if (name !== 'wikipedia') {
            acc[name] = dictionaries[name.toUpperCase()];
        }
        return acc;
    }, {});

    return data;
}

export async function fetchWikipediaData() {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: "fetchWikipediaData" }, response => {
            if (chrome.runtime.lastError) {
                console.error("Message passing error:", chrome.runtime.lastError);
                reject(chrome.runtime.lastError);
            } else if (response.error) {
                console.error("Error from background:", response.error);
                reject(response.error);
            } else {
                const combinedText = `${response.title}: ${response.summary}`;
                resolve([combinedText]);
            }
        });
    });
}

export async function fetchMovieData() {
    return dictionaries.MOVIES;
}
