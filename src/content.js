let lastKey = null;
let lastKeyTime = 0;
let lastMovie = null;
let lastMovieTarget = null;
let lastMovieOutputType = null;
let lastMovieTime = 0;
const MOVIE_LINK_TTL_MS = 60 * 1000;
const LOREM_WORDS = [
    'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
    'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
    'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud',
    'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip', 'ex', 'ea', 'commodo',
    'consequat', 'duis', 'aute', 'irure', 'in', 'reprehenderit', 'voluptate',
    'velit', 'esse', 'cillum', 'fugiat', 'nulla', 'pariatur', 'excepteur', 'sint',
    'occaecat', 'cupidatat', 'non', 'proident', 'sunt', 'culpa', 'qui', 'officia',
    'deserunt', 'mollit', 'anim', 'id', 'est', 'laborum'
];
const LOREM_START_WORDS = ['lorem', 'ipsum', 'dolor', 'sit', 'amet'];

document.addEventListener('keydown', async function (event) {
    const result = await new Promise((resolve) => {
        chrome.storage.sync.get(['enabled', 'mappings', 'commandChar', 'commandKey', 'useCommandChar', 'useCommandKey', 'useDoubleKey', 'doubleKeyDelayMs', 'websites', 'useWebsites', 'dictionarySettings', 'loremIpsumSettings', 'maxFakerChars', 'lengthMode'], resolve);
    });
    const enabled = result.enabled;
    const mappings = result.mappings || {};
    const commandKey = result.commandKey || 'AltLeft';
    const useCommandKey = result.useCommandKey !== false;
    const useDoubleKey = result.useDoubleKey !== false;
    const doubleKeyDelayMs = Math.min(1000, Math.max(50, Number(result.doubleKeyDelayMs) || 250));
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
                const activeElement = document.activeElement;
                const replacement = await getRandomItem(dictionary, result, activeElement);
                if (activeElement.tagName.toLowerCase() === 'input' || activeElement.tagName.toLowerCase() === 'textarea') {
                    activeElement.value = replacement;
                }
            }
        }, { once: true });
    }

    if (useDoubleKey) {
        const currentTime = new Date().getTime();
        if (lastKey === event.key && (currentTime - lastKeyTime) <= doubleKeyDelayMs) {
            const dictionary = mappings[event.key];
            if (!dictionary) return;
            const activeElement = document.activeElement;
            const replacement = await getRandomItem(dictionary, result, activeElement);
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
        chrome.storage.sync.get(['enabled', 'mappings', 'commandChar', 'useCommandChar', 'websites', 'useWebsites', 'dictionarySettings', 'loremIpsumSettings', 'maxFakerChars', 'lengthMode'], resolve);
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
            const replacement = await getRandomItem(dictionary, result, event.target);
            event.target.value = replacement;
        }
    }
});

async function getRandomItem(type, options = {}, target = null) {
    const { fetchData, fetchWikipediaData, fetchMovieData } = await import(chrome.runtime.getURL('src/data/index.js'));
    if (type === 'movie_titles' || type === 'movie_descriptions') {
        return getMovieItem(type, await fetchMovieData(), options, target);
    }
    if (type === 'lorem_ipsum') {
        return generateLoremIpsum(options.loremIpsumSettings);
    }

    const items = type === 'wikipedia'
        ? await fetchWikipediaData()
        : (await fetchData())[type];

    if (!items || items.length === 0) return '';

    const range = getLengthRange(type, options);
    const candidates = range.minChars > 0 || range.maxChars > 0
        ? items.filter(item => isInLengthRange(item, range))
        : items;
    const sourceItems = candidates.length > 0 ? candidates : items;
    const item = sourceItems[Math.floor(Math.random() * sourceItems.length)];

    return applyLengthSettings(item, type, options);
}


function getMovieItem(type, movies, options, target) {
    const now = Date.now();
    const hasRecentMovie = lastMovie && (now - lastMovieTime) <= MOVIE_LINK_TTL_MS;
    const targetChanged = target && target !== lastMovieTarget;
    const shouldAutoDescribeLastMovie = type === 'movie_titles'
        && hasRecentMovie
        && lastMovieOutputType === 'movie_titles'
        && targetChanged;
    const shouldUseDescription = type === 'movie_descriptions' || shouldAutoDescribeLastMovie;
    const movie = shouldUseDescription && hasRecentMovie
        ? lastMovie
        : movies[Math.floor(Math.random() * movies.length)];
    const outputType = shouldUseDescription ? 'movie_descriptions' : 'movie_titles';

    lastMovie = movie;
    lastMovieTarget = target || lastMovieTarget;
    lastMovieOutputType = outputType;
    lastMovieTime = now;

    return applyLengthSettings(outputType === 'movie_titles' ? movie.title : movie.description, outputType, options);
}

function getDictionaryOptions(type, options) {
    return options.dictionarySettings && options.dictionarySettings[type]
        ? options.dictionarySettings[type]
        : {};
}

function getLengthRange(type, options = {}) {
    const dictionaryOptions = getDictionaryOptions(type, options);
    const legacyMax = Number(options.maxFakerChars) || 0;
    const minChars = Math.max(0, Number(dictionaryOptions.minChars) || 0);
    const maxChars = Math.max(0, Number(dictionaryOptions.maxChars ?? legacyMax) || 0);

    return maxChars > 0 && minChars > maxChars
        ? { minChars: maxChars, maxChars: minChars }
        : { minChars, maxChars };
}

function isInLengthRange(value, range) {
    return (range.minChars === 0 || value.length >= range.minChars)
        && (range.maxChars === 0 || value.length <= range.maxChars);
}

function applyLengthSettings(value, type, options = {}) {
    const range = getLengthRange(type, options);

    return range.maxChars > 0 && value.length > range.maxChars
        ? trimToSentenceOrWordBoundary(value, range.maxChars)
        : value;
}

function trimToSentenceOrWordBoundary(value, maxLength) {
    const sentenceTrimmed = trimToSentenceBoundary(value, maxLength);
    return sentenceTrimmed || trimToWordBoundary(value, maxLength);
}

function trimToSentenceBoundary(value, maxLength) {
    const trimmed = value.slice(0, maxLength).trimEnd();
    const sentenceBoundaryIndex = Math.max(
        trimmed.lastIndexOf('.'),
        trimmed.lastIndexOf('!'),
        trimmed.lastIndexOf('?')
    );

    return sentenceBoundaryIndex > 0 ? trimmed.slice(0, sentenceBoundaryIndex + 1).trimEnd() : '';
}

function trimToWordBoundary(value, maxLength) {
    const trimmed = value.slice(0, maxLength).trimEnd();
    const wordBoundaryIndex = Math.max(
        trimmed.lastIndexOf(' '),
        trimmed.lastIndexOf('\n'),
        trimmed.lastIndexOf('\t')
    );

    return wordBoundaryIndex > 0 ? trimmed.slice(0, wordBoundaryIndex).trimEnd() : trimmed;
}


function getLoremIpsumSettings(settings = {}) {
    const unit = ['words', 'sentences', 'paragraphs'].includes(settings.unit)
        ? settings.unit
        : 'paragraphs';
    const limits = {
        words: { defaultCount: 24, min: 1, max: 200 },
        sentences: { defaultCount: 3, min: 1, max: 50 },
        paragraphs: { defaultCount: 2, min: 1, max: 20 }
    }[unit];
    const count = Math.min(limits.max, Math.max(limits.min, parseInt(settings.count, 10) || limits.defaultCount));

    return {
        unit,
        count,
        startWithLorem: settings.startWithLorem !== false
    };
}

function generateLoremIpsum(settings = {}) {
    const normalized = getLoremIpsumSettings(settings);
    if (normalized.unit === 'words') {
        return generateLoremWords(normalized.count, normalized.startWithLorem).join(' ');
    }
    if (normalized.unit === 'sentences') {
        return generateLoremSentences(normalized.count, normalized.startWithLorem).join(' ');
    }

    return generateLoremParagraphs(normalized.count, normalized.startWithLorem).join('\n\n');
}

function generateLoremParagraphs(count, startWithLorem) {
    return Array.from({ length: count }, (_, index) => {
        const sentenceCount = randomInt(3, 6);
        return generateLoremSentences(sentenceCount, startWithLorem && index === 0).join(' ');
    });
}

function generateLoremSentences(count, startWithLorem) {
    return Array.from({ length: count }, (_, index) => {
        const wordCount = randomInt(8, 16);
        return formatSentence(generateLoremWords(wordCount, startWithLorem && index === 0));
    });
}

function generateLoremWords(count, startWithLorem) {
    const words = [];
    if (startWithLorem) {
        words.push(...LOREM_START_WORDS.slice(0, Math.min(count, LOREM_START_WORDS.length)));
    }
    while (words.length < count) {
        words.push(LOREM_WORDS[Math.floor(Math.random() * LOREM_WORDS.length)]);
    }

    return words;
}

function formatSentence(words) {
    const sentence = words.join(' ');
    return sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.';
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
