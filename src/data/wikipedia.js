export const WIKIPEDIA = await fetchWikipediaData();

async function fetchWikipediaData() {
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
};