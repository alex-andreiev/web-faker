let lastKey = null;
let lastKeyTime = 0;
let lastKeyTarget = null;
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

// Keep settings available synchronously: key events cannot wait for storage.
let settings = null;
let settingsRevision = 0;
let commandArmed = false;
const pendingFills = new WeakMap();
chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    settingsRevision++;
    settings = settings || {};
    for (const [key, change] of Object.entries(changes)) settings[key] = change.newValue;
    commandArmed = false;
    lastKey = null;
});
const initialRevision = settingsRevision;
chrome.storage.sync.get(null, result => {
    if (settingsRevision === initialRevision) settings = result;
    else settings = { ...result, ...settings };
});

function eventEditor(event) {
    return getEditableElement(event.composedPath()[0]);
}

document.addEventListener('keydown', event => {
    if (!settings || event.isComposing || event.repeat) return;
    if (!canFillOnCurrentPage(settings)) {
        commandArmed = false;
        lastKey = null;
        return;
    }
    const editor = eventEditor(event);
    const commandKey = settings.commandKey || 'AltLeft';
    if (settings.useCommandKey !== false && event.code === commandKey) {
        commandArmed = !!editor;
        return;
    }
    const armed = commandArmed;
    commandArmed = false;
    if (!editor) {
        lastKey = null;
        return;
    }
    const dictionary = (settings.mappings || {})[event.key];
    const now = Date.now();
    const delay = Math.min(1000, Math.max(50, Number(settings.doubleKeyDelayMs) || 250));
    const doubleKey = settings.useDoubleKey === true && lastKey === event.key
        && lastKeyTarget === editor && now - lastKeyTime <= delay;
    lastKey = event.key;
    lastKeyTime = now;
    lastKeyTarget = editor;
    if (!dictionary || (!armed && !doubleKey)) return;
    event.preventDefault();
    lastKey = null;
    fillEditor(editor, dictionary, event.key);
}, true);

document.addEventListener('input', event => {
    if (!settings || event.isComposing || !canFillOnCurrentPage(settings)
        || settings.useCommandChar === false) return;
    const editor = eventEditor(event);
    if (!editor) return;
    const value = getEditableValue(editor);
    const prefix = settings.commandChar || '/';
    if (!value.startsWith(prefix)) return;
    const key = value.slice(prefix.length);
    const dictionary = (settings.mappings || {})[key];
    if (dictionary) fillEditor(editor, dictionary, key);
}, true);

async function fillEditor(editor, dictionary, key) {
    const request = {};
    pendingFills.set(editor, request);
    const original = getEditableValue(editor);
    const revision = settingsRevision;
    try {
        const replacement = await getRandomItem(dictionary, settings, editor, key);
        const latest = await new Promise(resolve =>
            chrome.storage.sync.get(['enabled', 'websites', 'useWebsites'], resolve));
        if (pendingFills.get(editor) !== request || revision !== settingsRevision
            || !editor.isConnected || getEditableValue(editor) !== original
            || !canFillOnCurrentPage(latest)) return;
        pendingFills.delete(editor);
        replaceEditableContent(editor, replacement);
    } catch (error) {
        console.warn('Web Faker could not fill this field:', error);
    }
}

function pageWebsite() {
    // The allowlist describes the visited website, including embedded editors.
    if (window === window.top) return window.location.href;
    try {
        return window.top.location.href;
    } catch {
        const ancestors = window.location.ancestorOrigins;
        return ancestors && ancestors.length ? ancestors[ancestors.length - 1] : '';
    }
}

function canFillOnCurrentPage({ enabled, useWebsites, websites }) {
    return enabled !== false && (!useWebsites || isWebsiteAllowed(pageWebsite(), websites));
}

function getEditableElement(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return null;
    if (element.matches('textarea, input')) {
        if (element.disabled || element.readOnly) return null;
        if (element.matches('textarea')) return element;
        return ['text', 'search', 'email', 'url', 'tel', 'password', 'number']
            .includes(element.type) ? element : null;
    }
    if (!element.isContentEditable) return null;
    let editor = element;
    while (editor.parentElement?.isContentEditable) editor = editor.parentElement;
    return editor;
}

function getEditableValue(element) {
    return element.matches('textarea, input') ? element.value : element.innerText || '';
}

function replaceEditableContent(element, replacement) {
    const doc = element.ownerDocument;
    const view = doc.defaultView;
    if (element.matches('textarea, input')) {
        const prototype = element.matches('textarea')
            ? view.HTMLTextAreaElement.prototype : view.HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, replacement);
        element.dispatchEvent(new view.InputEvent('input', {
            bubbles: true, composed: true, inputType: 'insertText', data: replacement
        }));
        return;
    }
    element.focus();
    const selection = element.getRootNode().getSelection?.() || view.getSelection();
    const range = doc.createRange();
    range.selectNodeContents(element);
    selection.removeAllRanges();
    selection.addRange(range);
    let notified = false;
    const onInput = () => { notified = true; };
    element.addEventListener('input', onInput, { once: true });
    try {
        if (!doc.execCommand || !doc.execCommand('insertText', false, replacement)) {
            element.textContent = replacement;
        }
    } finally {
        element.removeEventListener('input', onInput);
    }
    if (!notified) element.dispatchEvent(new view.InputEvent('input', {
        bubbles: true, composed: true, inputType: 'insertText', data: replacement
    }));
}

async function getRandomItem(type, options = {}, target = null, mappingKey = null) {
    const { fetchData, fetchWikipediaData, fetchMovieData } = await import(chrome.runtime.getURL('src/data/index.js'));
    if (type === 'movie_titles' || type === 'movie_descriptions') {
        return getMovieItem(type, await fetchMovieData(), options, target);
    }
    if (type === 'lorem_ipsum') {
        return generateLoremIpsum(getLoremIpsumMappingSettings(mappingKey, options));
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


function isWebsiteAllowed(currentWebsite, websites) {
    const currentHost = normalizeWebsite(currentWebsite);
    if (!currentHost) return false;

    return (Array.isArray(websites) ? websites : [])
        .map(normalizeWebsite)
        .filter(Boolean)
        .some(website => website === currentHost);
}

function normalizeWebsite(website) {
    const value = String(website || '').trim().toLowerCase();
    if (!value) return '';

    try {
        const url = new URL(value.includes('://') ? value : `https://${value}`);
        return url.host.replace(/\.$/, '');
    } catch (error) {
        return value.replace(/^https?:\/\//, '').split('/')[0].replace(/\.$/, '');
    }
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


function getLoremIpsumMappingSettings(mappingKey, options = {}) {
    const settings = options.loremIpsumMappingSettings || {};
    return mappingKey && settings[mappingKey]
        ? settings[mappingKey]
        : {};
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
