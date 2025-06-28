// popup.js: Handles the UI logic for the extension popup.
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const summarizeButton = document.getElementById('summarizeButton');
    const summaryOutput = document.getElementById('summaryOutput');
    const statusMessage = document.getElementById('statusMessage');
    const copySummaryButton = document.getElementById('copySummaryButton');
    const summaryTypeSelect = document.getElementById('summaryType');
    const summaryLengthSelect = document.getElementById('summaryLength');
    const settingsDescription = document.getElementById('settingsDescription');

    const settingDescriptions = { /* ... (keep this object as is) ... */ };

    // --- Core UI Rendering ---

    // Renders the entire popup UI based on the current state from storage.
    function renderState(state) {
        // Update status message
        if (state.status) {
            statusMessage.textContent = state.status;
            statusMessage.className = `text-sm mt-2 text-center ${state.isError ? 'text-red-600' : 'text-gray-600'}`;
        }

        // Update summary output
        if (state.summary) {
            summaryOutput.textContent = state.summary;
            if (state.settings && state.settings.type === 'key-points') {
                summaryOutput.style.whiteSpace = 'pre-wrap';
                summaryOutput.textContent = state.summary
                    .replace(/^\*\s?/, '• ')
                    .replace(/\s\*\s/g, '\n\n• ');
            } else {
                summaryOutput.style.whiteSpace = 'normal';
            }
        } else {
            summaryOutput.textContent = 'No summary generated yet. Click "Summarize" to begin.';
        }

        // Update button states
        setSummarizeButtonState(!state.isProcessing);
        copySummaryButton.classList.toggle('hidden', !state.summary || state.isProcessing);
    }

    // --- Event Listeners ---

    // On popup open, get the current state from storage and render it.
    chrome.storage.local.get(null, (result) => {
        if (chrome.runtime.lastError) {
            console.error("Error reading from storage:", chrome.runtime.lastError);
            return;
        }
        renderState(result);
    });

    // Listen for any changes in storage and re-render the UI.
    // This allows the popup to show live progress from the background script.
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local') {
            chrome.storage.local.get(null, (result) => renderState(result));
        }
    });

    // The Summarize button now sends a message to the background script.
    summarizeButton.addEventListener('click', async () => {
        setSummarizeButtonState(false);
        statusMessage.textContent = 'Getting page content...';

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.id) throw new Error('Could not get active tab information.');

            await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'getPageText' });
            const pageText = response ? response.text : '';

            if (!pageText || pageText.trim().length < 100) {
                throw new Error('Not enough content on the page to summarize.');
            }

            // Send the text and settings to the background script to do the work.
            chrome.runtime.sendMessage({
                action: 'summarize',
                text: pageText,
                settings: {
                    type: summaryTypeSelect.value,
                    length: summaryLengthSelect.value,
                }
            });

            statusMessage.textContent = 'Summarization started... You can close this window.';

        } catch (error) {
            console.error("Error starting summarization:", error);
            statusMessage.textContent = error.message;
            statusMessage.className = 'text-sm mt-2 text-center text-red-600';
            setSummarizeButtonState(true);
        }
    });

    // Use the modern, more secure Clipboard API.
    copySummaryButton.addEventListener('click', () => {
        navigator.clipboard.writeText(summaryOutput.textContent).then(() => {
            statusMessage.textContent = 'Summary copied to clipboard!';
            setTimeout(() => { statusMessage.textContent = ''; }, 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            statusMessage.textContent = 'Failed to copy summary.';
        });
    });

    // --- UI Helpers ---

    function setSummarizeButtonState(enabled) {
        summarizeButton.disabled = !enabled;
        if (enabled) {
            summarizeButton.classList.remove('opacity-50', 'cursor-not-allowed');
        } else {
            summarizeButton.classList.add('opacity-50', 'cursor-not-allowed');
        }
    }

    function updateSettingsUI() {
        const type = summaryTypeSelect.value;
        const length = summaryLengthSelect.value;
        summaryLengthSelect.disabled = (type === 'headline');
        summaryLengthSelect.classList.toggle('opacity-50', type === 'headline');
        if (settingDescriptions[type] && settingDescriptions[type][length]) {
            settingsDescription.textContent = settingDescriptions[type][length];
        }
    }

    // Add event listeners for settings changes
    summaryTypeSelect.addEventListener('change', updateSettingsUI);
    summaryLengthSelect.addEventListener('change', updateSettingsUI);

    // Initial setup
    updateSettingsUI();
});