document.addEventListener('DOMContentLoaded', async function () {
    const { DICTIONARIES } = await import(chrome.runtime.getURL('src/data/index.js'));

    // Initialize default settings if not set
    chrome.storage.sync.get(['enabled', 'mappings', 'commandChar', 'commandKey', 'useCommandChar', 'useCommandKey', 'useDoubleKey', 'websites', 'useWebsites'], function (result) {
        if (result.enabled === undefined) {
            chrome.storage.sync.set({ enabled: true }, function () {
                document.getElementById('toggleExtension').checked = true;
                updateToggleLabel(true);
            });
        } else {
            document.getElementById('toggleExtension').checked = result.enabled;
            updateToggleLabel(result.enabled);
        }
        if (result.mappings === undefined) {
            const defaultMappings = DICTIONARIES.filter(dict => dict.default).reduce((acc, dict) => {
                acc[dict.key] = dict.name;
                return acc;
            }, {});
            chrome.storage.sync.set({ mappings: defaultMappings });
        } else {
            populateSettingsTable(result.mappings);
            populateReferenceTable(result.mappings); // Populate reference table with current mappings
        }
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
        populateDictionarySelect();
    });

    // Toggle extension state
    document.getElementById('toggleExtension').addEventListener('change', function (event) {
        const enabled = event.target.checked;
        chrome.storage.sync.set({ enabled: enabled });
        updateToggleLabel(enabled);
    });

    // Toggle command character usage
    document.getElementById('toggleCommandChar').addEventListener('change', function (event) {
        const useCommandChar = event.target.checked;
        chrome.storage.sync.set({ useCommandChar: useCommandChar });
    });

    // Toggle command key usage
    document.getElementById('toggleCommandKey').addEventListener('change', function (event) {
        const useCommandKey = event.target.checked;
        chrome.storage.sync.set({ useCommandKey: useCommandKey });
    });

    // Toggle double key usage
    document.getElementById('toggleDoubleKey').addEventListener('change', function (event) {
        const useDoubleKey = event.target.checked;
        chrome.storage.sync.set({ useDoubleKey: useDoubleKey });
    });

    // Toggle website usage
    document.getElementById('toggleWebsites').addEventListener('change', function (event) {
        const useWebsites = event.target.checked;
        chrome.storage.sync.set({ useWebsites: useWebsites });
    });

    // Show settings table
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

    // Show help section
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

    // Add new row for key-dictionary mapping
    document.getElementById('addMapping').addEventListener('click', function () {
        const tableBody = document.getElementById('settingsTableBody');
        const row = document.createElement('tr');
        const keyCell = document.createElement('td');
        const keyInput = document.createElement('input');
        keyInput.type = 'text';
        keyInput.maxLength = 1;
        keyCell.appendChild(keyInput);
        const dictionaryCell = document.createElement('td');
        const select = document.createElement('select');
        DICTIONARIES.forEach(dict => {
            const option = document.createElement('option');
            option.value = dict.name;
            option.textContent = dict.name;
            select.appendChild(option);
        });
        dictionaryCell.appendChild(select);
        const deleteCell = document.createElement('td');
        const deleteButton = document.createElement('button');
        deleteButton.innerHTML = '&#128465;';
        deleteButton.classList.add('delete-button');
        deleteButton.addEventListener('click', function () {
            row.remove();
        });
        deleteCell.appendChild(deleteButton);
        row.appendChild(keyCell);
        row.appendChild(dictionaryCell);
        row.appendChild(deleteCell);
        tableBody.appendChild(row);
    });

    // Save key-dictionary mappings
    document.getElementById('saveMappings').addEventListener('click', function () {
        const tableBody = document.getElementById('settingsTableBody');
        const rows = tableBody.getElementsByTagName('tr');
        const mappings = {};
        for (const row of rows) {
            const key = row.cells[0].getElementsByTagName('input')[0].value;
            const dictionary = row.cells[1].getElementsByTagName('select')[0].value;
            if (key) {
                mappings[key] = dictionary;
            }
        }
        const commandChar = document.getElementById('commandChar').value;
        const commandKey = document.getElementById('commandKey').value;
        const useCommandChar = document.getElementById('toggleCommandChar').checked;
        const useCommandKey = document.getElementById('toggleCommandKey').checked;
        const useDoubleKey = document.getElementById('toggleDoubleKey').checked;
        chrome.storage.sync.set({ mappings: mappings, commandChar: commandChar, commandKey: commandKey, useCommandChar: useCommandChar, useCommandKey: useCommandKey, useDoubleKey: useDoubleKey }, function () {
            populateSettingsTable(mappings);
            // Hide settings table and show reference table
            document.getElementById('settings').classList.remove('active');
            document.getElementById('settings').style.display = 'none';
            document.getElementById('reference').classList.add('active');
            document.getElementById('reference').style.display = 'block';
        });
    });

    // Reset settings to default
    document.getElementById('resetSettings').addEventListener('click', function () {
        const defaultMappings = DICTIONARIES.filter(dict => dict.default).reduce((acc, dict) => {
            acc[dict.key] = dict.name;
            return acc;
        }, {});
        chrome.storage.sync.set({
            enabled: true,
            mappings: defaultMappings,
            commandChar: '/',
            commandKey: 'AltLeft',
            useCommandChar: true,
            useCommandKey: true,
            useDoubleKey: false,
            websites: [],
            useWebsites: false
        }, function () {
            document.getElementById('toggleExtension').checked = true;
            document.getElementById('commandChar').value = '/';
            document.getElementById('commandKey').value = 'AltLeft';
            document.getElementById('toggleCommandChar').checked = true;
            document.getElementById('toggleCommandKey').checked = true;
            document.getElementById('toggleDoubleKey').checked = false;
            document.getElementById('toggleWebsites').checked = false;
            populateSettingsTable(defaultMappings);
            populateReferenceTable(defaultMappings);
            populateWebsiteTable([]);
        });
    });

    // Add new website to the list
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

    function populateSettingsTable(mappings) {
        const tableBody = document.getElementById('settingsTableBody');
        tableBody.innerHTML = '';
        for (const [key, dictionary] of Object.entries(mappings)) {
            const row = document.createElement('tr');
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
                option.textContent = dict.name;
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
                delete mappings[key];
                chrome.storage.sync.set({ mappings: mappings }, function () {
                    populateSettingsTable(mappings);
                });
            });
            deleteCell.appendChild(deleteButton);
            row.appendChild(keyCell);
            row.appendChild(dictionaryCell);
            row.appendChild(deleteCell);
            tableBody.appendChild(row);
        }
    }

    function populateReferenceTable(mappings) {
        const referenceTableBody = document.getElementById('referenceTableBody');
        referenceTableBody.innerHTML = '';
        for (const [key, dictionary] of Object.entries(mappings)) {
            const row = document.createElement('tr');
            const keyCell = document.createElement('td');
            keyCell.textContent = key;
            const dictionaryCell = document.createElement('td');
            dictionaryCell.textContent = dictionary;
            row.appendChild(keyCell);
            row.appendChild(dictionaryCell);
            referenceTableBody.appendChild(row);
        }

        const referenceSettings = document.getElementById('referenceSettings');
        referenceSettings.innerHTML = '';
        chrome.storage.sync.get(['commandChar', 'commandKey', 'useCommandChar', 'useCommandKey', 'useDoubleKey'], function (result) {
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
                doubleKeyRow.textContent = 'Double Key: Enabled';
                referenceSettings.appendChild(doubleKeyRow);
            }
        });
    }

    function populateDictionarySelect() {
        const dictionarySelect = document.getElementById('dictionarySelect');
        if (dictionarySelect) {
            dictionarySelect.innerHTML = '';
            DICTIONARIES.forEach(dict => {
                const option = document.createElement('option');
                option.value = dict.name;
                option.textContent = dict.name;
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

    // Tab functionality
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', function () {
            const tabId = this.getAttribute('data-tab');
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.style.display = 'none';
            });
            document.getElementById(tabId).style.display = 'block';
        });
    });

    // Set default tab to Key-Dictionary Mappings
    document.querySelector('.tab-button[data-tab="mappingsTab"]').click();
});
