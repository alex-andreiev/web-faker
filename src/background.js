chrome.runtime.onInstalled.addListener(function () {
    // Set default settings
    chrome.storage.sync.set({ activationChar: '/' }, function () {
        console.log("Default activation character set to '/'.");
    });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "fetchWikipediaData") {
        fetch('https://en.wikipedia.org/api/rest_v1/page/random/summary')
            .then(response => response.json())
            .then(data => {
                if (!data.title) {
                    sendResponse({ error: "No articles found" });
                    return;
                }
                sendResponse({
                    title: data.title,
                    summary: data.extract,
                    url: data.content_urls.desktop.page,
                    image: data.thumbnail ? data.thumbnail.source : null
                });
            })
            .catch(error => {
                console.error("Error fetching Wikipedia data:", error);
                sendResponse({ error: error.message });
            });

        return true; // Indicates that sendResponse will be called asynchronously
    }
});
