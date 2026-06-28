let lastKey = null;
let lastKeyTime = 0;

document.addEventListener('keydown', async function (event) {
    const result = await new Promise((resolve) => {
        chrome.storage.sync.get(['enabled', 'mappings', 'commandChar', 'commandKey', 'useCommandChar', 'useCommandKey', 'useDoubleKey', 'websites', 'useWebsites'], resolve);
    });
    const enabled = result.enabled;
    const mappings = result.mappings || {};
    const commandKey = result.commandKey || 'AltLeft';
    const useCommandKey = result.useCommandKey !== false;
    const useDoubleKey = result.useDoubleKey !== false;
    const websites = result.websites || [];
    const useWebsites = result.useWebsites !== false;
    const currentWebsite = window.location.hostname;

    if (!enabled || (useWebsites && websites.length > 0 && !websites.includes(currentWebsite))) return;

    if (useCommandKey && event.code === commandKey) {
        document.addEventListener('keydown', async function (e) {
            if (e.code !== commandKey) {
                const key = e.key;
                const dictionary = mappings[key];
                if (!dictionary) return;
                const replacement = await getRandomItem(dictionary);
                const activeElement = document.activeElement;
                if (activeElement.tagName.toLowerCase() === 'input' || activeElement.tagName.toLowerCase() === 'textarea') {
                    activeElement.value = replacement;
                }
            }
        }, { once: true });
    }

    if (useDoubleKey) {
        const currentTime = new Date().getTime();
        if (lastKey === event.key && (currentTime - lastKeyTime) < 500) {
            const dictionary = mappings[event.key];
            if (!dictionary) return;
            const replacement = await getRandomItem(dictionary);
            const activeElement = document.activeElement;
            if (activeElement.tagName.toLowerCase() === 'input' || activeElement.tagName.toLowerCase() === 'textarea') {
                activeElement.value = replacement;
            }
        }
        lastKey = event.key;
        lastKeyTime = currentTime;
    }
});

document.addEventListener('input', async function (event) {
    const result = await new Promise((resolve) => {
        chrome.storage.sync.get(['enabled', 'mappings', 'commandChar', 'useCommandChar', 'websites', 'useWebsites'], resolve);
    });
    const enabled = result.enabled;
    const mappings = result.mappings || {};
    const commandChar = result.commandChar || '/';
    const useCommandChar = result.useCommandChar !== false;
    const websites = result.websites || [];
    const useWebsites = result.useWebsites !== false;
    const currentWebsite = window.location.hostname;

    if (!enabled || (useWebsites && websites.length > 0 && !websites.includes(currentWebsite))) return;

    if (useCommandChar && (event.target.tagName.toLowerCase() === 'input' || event.target.tagName.toLowerCase() === 'textarea')) {
        const value = event.target.value;
        if (value.startsWith(commandChar)) {
            const command = value.substring(commandChar.length);
            const dictionary = mappings[command];
            if (!dictionary) return;
            const replacement = await getRandomItem(dictionary);
            event.target.value = replacement;
        }
    }
});

async function getRandomItem(type) {
    const { fetchData } = await import(chrome.runtime.getURL('src/data/index.js'));
    const data = await fetchData();
    const items = data[type];
    if (!items || items.length === 0) return '';
    return items[Math.floor(Math.random() * items.length)];
}

