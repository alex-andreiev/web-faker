document.addEventListener('DOMContentLoaded', async function () {
    const { DICTIONARIES } = await import(chrome.runtime.getURL('src/data/index.js'));

    chrome.storage.sync.get([
        'enabled',
        'mappings',
        'commandChar',
        'commandKey',
        'useCommandChar',
        'useCommandKey',
        'useDoubleKey',
        'doubleKeyDelayMs',
        'websites',
        'useWebsites',
        'dictionarySettings',
        'loremIpsumSettings',
        'maxFakerChars',
        'lengthMode'
    ], function (result) {
        const defaultMappings = getDefaultMappings();
        const mappingState = normalizeMappings(result.mappings, defaultMappings);
        const mappings = mappingState.mappings;
        const dictionarySettings = normalizeDictionarySettings(result.dictionarySettings, result);
        const loremIpsumSettings = normalizeLoremIpsumSettings(result.loremIpsumSettings);

        if (result.enabled === undefined) {
            chrome.storage.sync.set({ enabled: true });
        }
        document.getElementById('toggleExtension').checked = result.enabled !== false;
        updateToggleLabel(result.enabled !== false);

        if (result.mappings === undefined || mappingState.changed) {
            chrome.storage.sync.set({ mappings: mappings });
        }
        populateSettingsTable(mappings);
        populateReferenceTable(mappings, dictionarySettings, loremIpsumSettings);

        if (result.commandChar === undefined) {
            chrome.storage.sync.set({ commandChar: '/' });
        } else {
            document.getElementById('commandChar').value = result.commandChar;
        }
        if (result.commandKey === undefined) {
            chrome.storage.sync.set({ commandKey: 'AltLeft' });
        } else {
            document.getElementById('commandKey').value = result.commandKey;
        }
        if (result.useCommandChar === undefined) {
            chrome.storage.sync.set({ useCommandChar: true });
        } else {
            document.getElementById('toggleCommandChar').checked = result.useCommandChar;
        }
        if (result.useCommandKey === undefined) {
            chrome.storage.sync.set({ useCommandKey: true });
        } else {
            document.getElementById('toggleCommandKey').checked = result.useCommandKey;
        }
        if (result.useDoubleKey === undefined) {
            chrome.storage.sync.set({ useDoubleKey: false });
        } else {
            document.getElementById('toggleDoubleKey').checked = result.useDoubleKey;
        }
        if (result.doubleKeyDelayMs === undefined) {
            chrome.storage.sync.set({ doubleKeyDelayMs: 250 });
        } else {
            document.getElementById('doubleKeyDelayMs').value = result.doubleKeyDelayMs;
        }
        updateDoubleKeyDelayState();
        if (result.websites === undefined) {
            chrome.storage.sync.set({ websites: [] });
        } else {
            populateWebsiteTable(result.websites);
        }
        if (result.useWebsites === undefined) {
            chrome.storage.sync.set({ useWebsites: false });
        } else {
            document.getElementById('toggleWebsites').checked = result.useWebsites;
        }
        if (result.dictionarySettings === undefined) {
            chrome.storage.sync.set({ dictionarySettings: dictionarySettings });
        }
        if (result.loremIpsumSettings === undefined) {
            chrome.storage.sync.set({ loremIpsumSettings: loremIpsumSettings });
        }
        populateDictionarySettingsTable(dictionarySettings);
        populateLoremIpsumSettings(loremIpsumSettings);
        populateDictionarySelect();
    });

    document.getElementById('toggleExtension').addEventListener('change', function (event) {
        const enabled = event.target.checked;
        chrome.storage.sync.set({ enabled: enabled });
        updateToggleLabel(enabled);
    });

    document.getElementById('toggleCommandChar').addEventListener('change', function (event) {
        chrome.storage.sync.set({ useCommandChar: event.target.checked });
    });

    document.getElementById('toggleCommandKey').addEventListener('change', function (event) {
        chrome.storage.sync.set({ useCommandKey: event.target.checked });
    });

    document.getElementById('toggleDoubleKey').addEventListener('change', function (event) {
        chrome.storage.sync.set({ useDoubleKey: event.target.checked });
        updateDoubleKeyDelayState();
    });

    document.getElementById('toggleWebsites').addEventListener('change', function (event) {
        chrome.storage.sync.set({ useWebsites: event.target.checked });
    });

    document.getElementById('settingsIcon').addEventListener('click', function () {
        const settings = document.getElementById('settings');
        const reference = document.getElementById('reference');
        const help = document.getElementById('help');
        if (settings.classList.contains('active')) {
            settings.classList.remove('active');
            settings.style.display = 'none';
            reference.classList.add('active');
            reference.style.display = 'block';
            help.style.display = 'none';
        } else {
            settings.classList.add('active');
            settings.style.display = 'block';
            reference.classList.remove('active');
            reference.style.display = 'none';
            help.style.display = 'none';
        }
    });

    document.getElementById('helpIcon').addEventListener('click', function () {
        const settings = document.getElementById('settings');
        const reference = document.getElementById('reference');
        const help = document.getElementById('help');
        if (help.classList.contains('active')) {
            help.classList.remove('active');
            help.style.display = 'none';
            reference.classList.add('active');
            reference.style.display = 'block';
            settings.style.display = 'none';
        } else {
            help.classList.add('active');
            help.style.display = 'block';
            reference.classList.remove('active');
            reference.style.display = 'none';
            settings.style.display = 'none';
        }
    });

    document.getElementById('addMapping').addEventListener('click', function () {
        const tableBody = document.getElementById('settingsTableBody');
        const row = document.createElement('tr');
        appendMappingCells(row, '', DICTIONARIES[0].name, null);
        tableBody.appendChild(row);
    });

    document.getElementById('saveMappings').addEventListener('click', function () {
        saveAllSettings(function (mappings, dictionarySettings) {
            populateSettingsTable(mappings);
            populateReferenceTable(mappings, dictionarySettings, collectLoremIpsumSettings());
            document.getElementById('settings').classList.remove('active');
            document.getElementById('settings').style.display = 'none';
            document.getElementById('reference').classList.add('active');
            document.getElementById('reference').style.display = 'block';
        });
    });

    document.getElementById('saveControls').addEventListener('click', function () {
        saveAllSettings(function (mappings, dictionarySettings, loremIpsumSettings) {
            populateReferenceTable(mappings, dictionarySettings, loremIpsumSettings);
        });
    });

    document.getElementById('saveLoremIpsum').addEventListener('click', function () {
        saveAllSettings(function (mappings, dictionarySettings, loremIpsumSettings) {
            populateLoremIpsumSettings(loremIpsumSettings);
            populateReferenceTable(mappings, dictionarySettings, loremIpsumSettings);
        });
    });

    document.getElementById('resetSettings').addEventListener('click', function () {
        const defaultMappings = getDefaultMappings();
        const dictionarySettings = normalizeDictionarySettings();
        const loremIpsumSettings = getDefaultLoremIpsumSettings();
        chrome.storage.sync.set({
            enabled: true,
            mappings: defaultMappings,
            commandChar: '/',
            commandKey: 'AltLeft',
            useCommandChar: true,
            useCommandKey: true,
            useDoubleKey: false,
            doubleKeyDelayMs: 250,
            websites: [],
            useWebsites: false,
            dictionarySettings: dictionarySettings,
            loremIpsumSettings: loremIpsumSettings,
            maxFakerChars: 0,
            lengthMode: 'fit'
        }, function () {
            document.getElementById('toggleExtension').checked = true;
            document.getElementById('commandChar').value = '/';
            document.getElementById('commandKey').value = 'AltLeft';
            document.getElementById('toggleCommandChar').checked = true;
            document.getElementById('toggleCommandKey').checked = true;
            document.getElementById('toggleDoubleKey').checked = false;
            document.getElementById('doubleKeyDelayMs').value = 250;
            updateDoubleKeyDelayState();
            document.getElementById('toggleWebsites').checked = false;
            populateSettingsTable(defaultMappings);
            populateDictionarySettingsTable(dictionarySettings);
            populateLoremIpsumSettings(loremIpsumSettings);
            populateReferenceTable(defaultMappings, dictionarySettings, loremIpsumSettings);
            populateWebsiteTable([]);
        });
    });

    document.getElementById('addWebsite').addEventListener('click', function () {
        const websiteInput = document.getElementById('websiteInput');
        const website = websiteInput.value.trim();
        if (website) {
            chrome.storage.sync.get(['websites'], function (result) {
                const websites = result.websites || [];
                if (!websites.includes(website)) {
                    websites.push(website);
                    chrome.storage.sync.set({ websites: websites }, function () {
                        populateWebsiteTable(websites);
                        websiteInput.value = '';
                    });
                }
            });
        }
    });

    function getDefaultMappings() {
        return DICTIONARIES.filter(dict => dict.default).reduce((acc, dict) => {
            acc[dict.key] = dict.name;
            return acc;
        }, {});
    }

    function normalizeMappings(storedMappings, defaultMappings) {
        if (!storedMappings) {
            return { mappings: defaultMappings, changed: true };
        }

        const mappings = { ...storedMappings };
        let changed = false;
        for (const [key, dictionary] of Object.entries(defaultMappings)) {
            const hasDictionary = Object.values(mappings).includes(dictionary);
            if (!hasDictionary && mappings[key] === undefined) {
                mappings[key] = dictionary;
                changed = true;
            }
        }

        return { mappings, changed };
    }

    function getDictionaryLabel(dictionaryName) {
        const dictionary = DICTIONARIES.find(dict => dict.name === dictionaryName);
        return dictionary && dictionary.label ? dictionary.label : dictionaryName;
    }

    function getDefaultLoremIpsumSettings() {
        return {
            unit: 'paragraphs',
            count: 2,
            startWithLorem: true
        };
    }

    function normalizeLoremIpsumSettings(settings = {}) {
        const unitLimits = {
            words: { defaultCount: 24, min: 1, max: 200 },
            sentences: { defaultCount: 3, min: 1, max: 50 },
            paragraphs: { defaultCount: 2, min: 1, max: 20 }
        };
        const unit = unitLimits[settings.unit] ? settings.unit : 'paragraphs';
        const limits = unitLimits[unit];
        const count = Math.min(limits.max, Math.max(limits.min, parseInt(settings.count, 10) || limits.defaultCount));

        return {
            unit: unit,
            count: count,
            startWithLorem: settings.startWithLorem !== false
        };
    }

    function normalizeDictionarySettings(settings = {}, fallback = {}) {
        return DICTIONARIES.filter(dict => !dict.generated).reduce((acc, dict) => {
            const current = settings[dict.name] || {};
            const minChars = Math.max(0, parseInt(current.minChars ?? 0, 10) || 0);
            const maxChars = Math.max(0, parseInt(current.maxChars ?? fallback.maxFakerChars ?? 0, 10) || 0);
            acc[dict.name] = maxChars > 0 && minChars > maxChars
                ? { minChars: maxChars, maxChars: minChars }
                : { minChars: minChars, maxChars: maxChars };
            return acc;
        }, {});
    }

    function collectMappings() {
        const rows = document.getElementById('settingsTableBody').getElementsByTagName('tr');
        const mappings = {};
        for (const row of rows) {
            const key = row.cells[0].getElementsByTagName('input')[0].value;
            const dictionary = row.cells[1].getElementsByTagName('select')[0].value;
            if (key) {
                mappings[key] = dictionary;
            }
        }
        return mappings;
    }

    function collectLoremIpsumSettings() {
        return normalizeLoremIpsumSettings({
            unit: document.getElementById('loremUnit').value,
            count: document.getElementById('loremCount').value,
            startWithLorem: document.getElementById('toggleLoremStart').checked
        });
    }

    function collectDictionarySettings() {
        const rows = document.getElementById('dictionarySettingsTableBody').getElementsByTagName('tr');
        const settings = {};
        for (const row of rows) {
            const dictionary = row.dataset.dictionary;
            const minChars = Math.max(0, parseInt(row.cells[1].getElementsByTagName('input')[0].value, 10) || 0);
            const maxChars = Math.max(0, parseInt(row.cells[2].getElementsByTagName('input')[0].value, 10) || 0);
            settings[dictionary] = { minChars: minChars, maxChars: maxChars };
        }
        return normalizeDictionarySettings(settings);
    }

    function saveAllSettings(callback) {
        const mappings = collectMappings();
        const dictionarySettings = collectDictionarySettings();
        const commandChar = document.getElementById('commandChar').value;
        const commandKey = document.getElementById('commandKey').value;
        const useCommandChar = document.getElementById('toggleCommandChar').checked;
        const useCommandKey = document.getElementById('toggleCommandKey').checked;
        const useDoubleKey = document.getElementById('toggleDoubleKey').checked;
        const doubleKeyDelayMs = Math.min(1000, Math.max(50, parseInt(document.getElementById('doubleKeyDelayMs').value, 10) || 250));
        const loremIpsumSettings = collectLoremIpsumSettings();
        chrome.storage.sync.set({
            mappings: mappings,
            commandChar: commandChar,
            commandKey: commandKey,
            useCommandChar: useCommandChar,
            useCommandKey: useCommandKey,
            useDoubleKey: useDoubleKey,
            doubleKeyDelayMs: doubleKeyDelayMs,
            dictionarySettings: dictionarySettings,
            loremIpsumSettings: loremIpsumSettings,
            maxFakerChars: 0,
            lengthMode: 'fit'
        }, function () {
            callback(mappings, dictionarySettings, loremIpsumSettings);
        });
    }

    function appendMappingCells(row, key, dictionary, mappings) {
        const keyCell = document.createElement('td');
        const keyInput = document.createElement('input');
        keyInput.type = 'text';
        keyInput.value = key;
        keyInput.maxLength = 1;
        keyCell.appendChild(keyInput);

        const dictionaryCell = document.createElement('td');
        const select = document.createElement('select');
        DICTIONARIES.forEach(dict => {
            const option = document.createElement('option');
            option.value = dict.name;
            option.textContent = dict.label || dict.name;
            if (dict.name === dictionary) {
                option.selected = true;
            }
            select.appendChild(option);
        });
        dictionaryCell.appendChild(select);

        const deleteCell = document.createElement('td');
        const deleteButton = document.createElement('button');
        deleteButton.innerHTML = '&#128465;';
        deleteButton.classList.add('delete-button');
        deleteButton.addEventListener('click', function () {
            row.remove();
            if (mappings) {
                delete mappings[key];
                chrome.storage.sync.set({ mappings: mappings });
            }
        });
        deleteCell.appendChild(deleteButton);

        row.appendChild(keyCell);
        row.appendChild(dictionaryCell);
        row.appendChild(deleteCell);
    }

    function populateSettingsTable(mappings) {
        const tableBody = document.getElementById('settingsTableBody');
        tableBody.innerHTML = '';
        for (const [key, dictionary] of Object.entries(mappings)) {
            const row = document.createElement('tr');
            appendMappingCells(row, key, dictionary, mappings);
            tableBody.appendChild(row);
        }
    }

    function populateDictionarySettingsTable(settings) {
        const tableBody = document.getElementById('dictionarySettingsTableBody');
        tableBody.innerHTML = '';
        DICTIONARIES.filter(dict => !dict.generated).forEach(dict => {
            const current = settings[dict.name] || { minChars: 0, maxChars: 0 };
            const row = document.createElement('tr');
            row.dataset.dictionary = dict.name;

            const nameCell = document.createElement('td');
            nameCell.textContent = dict.label || dict.name;

            const minCell = document.createElement('td');
            const minInput = document.createElement('input');
            minInput.type = 'number';
            minInput.min = '0';
            minInput.step = '1';
            minInput.value = current.minChars || 0;
            minCell.appendChild(minInput);

            const maxCell = document.createElement('td');
            const maxInput = document.createElement('input');
            maxInput.type = 'number';
            maxInput.min = '0';
            maxInput.step = '1';
            maxInput.value = current.maxChars || 0;
            maxCell.appendChild(maxInput);

            row.appendChild(nameCell);
            row.appendChild(minCell);
            row.appendChild(maxCell);
            tableBody.appendChild(row);
        });
    }

    function populateReferenceTable(mappings, dictionarySettings, loremIpsumSettings) {
        const referenceTableBody = document.getElementById('referenceTableBody');
        referenceTableBody.innerHTML = '';
        for (const [key, dictionary] of Object.entries(mappings)) {
            const settings = dictionarySettings[dictionary] || { minChars: 0, maxChars: 0 };
            const row = document.createElement('tr');
            const keyCell = document.createElement('td');
            keyCell.textContent = key;
            const dictionaryCell = document.createElement('td');
            dictionaryCell.textContent = getDictionaryLabel(dictionary);
            const minCell = document.createElement('td');
            minCell.textContent = dictionary === 'lorem_ipsum' ? 'Generated' : settings.minChars || 'Any';
            const maxCell = document.createElement('td');
            maxCell.textContent = dictionary === 'lorem_ipsum' ? 'Custom' : settings.maxChars || 'Any';
            row.appendChild(keyCell);
            row.appendChild(dictionaryCell);
            row.appendChild(minCell);
            row.appendChild(maxCell);
            referenceTableBody.appendChild(row);
        }

        const referenceSettings = document.getElementById('referenceSettings');
        referenceSettings.innerHTML = '';
        chrome.storage.sync.get(['commandChar', 'commandKey', 'useCommandChar', 'useCommandKey', 'useDoubleKey', 'doubleKeyDelayMs'], function (result) {
            if (result.useCommandChar) {
                const commandCharRow = document.createElement('div');
                commandCharRow.textContent = `Command Char: ${result.commandChar}`;
                referenceSettings.appendChild(commandCharRow);
            }
            if (result.useCommandKey) {
                const commandKeyRow = document.createElement('div');
                commandKeyRow.textContent = `Command Key: ${result.commandKey}`;
                referenceSettings.appendChild(commandKeyRow);
            }
            if (result.useDoubleKey) {
                const doubleKeyRow = document.createElement('div');
                doubleKeyRow.textContent = `Double Key: Enabled (${result.doubleKeyDelayMs || 250}ms)`;
                referenceSettings.appendChild(doubleKeyRow);
            }
            if (Object.values(mappings).includes('lorem_ipsum')) {
                const normalizedLorem = normalizeLoremIpsumSettings(loremIpsumSettings);
                const loremRow = document.createElement('div');
                loremRow.textContent = `Lorem Ipsum: ${normalizedLorem.count} ${normalizedLorem.unit}`
                    + (normalizedLorem.startWithLorem ? ', starts with Lorem ipsum' : '');
                referenceSettings.appendChild(loremRow);
            }
        });
    }

    function populateLoremIpsumSettings(settings) {
        const normalized = normalizeLoremIpsumSettings(settings);
        document.getElementById('loremUnit').value = normalized.unit;
        document.getElementById('loremCount').value = normalized.count;
        document.getElementById('toggleLoremStart').checked = normalized.startWithLorem;
        updateLoremCountLimits();
    }

    function populateDictionarySelect() {
        const dictionarySelect = document.getElementById('dictionarySelect');
        if (dictionarySelect) {
            dictionarySelect.innerHTML = '';
            DICTIONARIES.forEach(dict => {
                const option = document.createElement('option');
                option.value = dict.name;
                option.textContent = dict.label || dict.name;
                dictionarySelect.appendChild(option);
            });
        }
    }

    function populateWebsiteTable(websites) {
        const websiteTableBody = document.getElementById('websiteTableBody');
        websiteTableBody.innerHTML = '';
        websites.forEach(website => {
            const row = document.createElement('tr');
            const websiteCell = document.createElement('td');
            websiteCell.textContent = website;
            const deleteCell = document.createElement('td');
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Remove';
            deleteButton.addEventListener('click', function () {
                const updatedWebsites = websites.filter(w => w !== website);
                chrome.storage.sync.set({ websites: updatedWebsites }, function () {
                    populateWebsiteTable(updatedWebsites);
                });
            });
            deleteCell.appendChild(deleteButton);
            row.appendChild(websiteCell);
            row.appendChild(deleteCell);
            websiteTableBody.appendChild(row);
        });
    }

    function updateToggleLabel(enabled) {
        const toggleLabel = document.getElementById('toggleLabel');
        toggleLabel.textContent = enabled ? 'Enabled' : 'Disabled';
    }

    function updateDoubleKeyDelayState() {
        const input = document.getElementById('doubleKeyDelayMs');
        input.disabled = !document.getElementById('toggleDoubleKey').checked;
    }

    function updateLoremCountLimits() {
        const limits = {
            words: { max: 200 },
            sentences: { max: 50 },
            paragraphs: { max: 20 }
        };
        const unit = document.getElementById('loremUnit').value;
        const input = document.getElementById('loremCount');
        input.max = limits[unit].max;
        input.value = normalizeLoremIpsumSettings({
            unit: unit,
            count: input.value,
            startWithLorem: document.getElementById('toggleLoremStart').checked
        }).count;
    }

    document.getElementById('loremUnit').addEventListener('change', updateLoremCountLimits);

    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', function () {
            const tabId = this.getAttribute('data-tab');
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.style.display = 'none';
            });
            document.getElementById(tabId).style.display = 'block';
        });
    });

    document.querySelector('.tab-button[data-tab="mappingsTab"]').click();
});
