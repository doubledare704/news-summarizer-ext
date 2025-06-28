// popup.js: Handles the logic for the extension popup
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const summarizeButton = document.getElementById('summarizeButton');
    const summaryOutput = document.getElementById('summaryOutput');
    const statusMessage = document.getElementById('statusMessage');
    const copySummaryButton = document.getElementById('copySummaryButton');
    const summaryTypeSelect = document.getElementById('summaryType');
    const summaryLengthSelect = document.getElementById('summaryLength');
    const settingsDescription = document.getElementById('settingsDescription');

    // Descriptions for different summary settings to guide the user
    const settingDescriptions = {
        'tldr': {
            'short': 'Short TL;DR: A single sentence summary.',
            'medium': 'Medium TL;DR: A few sentences for a quick overview.',
            'long': 'Long TL;DR: A short paragraph summary.'
        },
        'teaser': {
            'short': 'Short Teaser: An engaging snippet to pique interest.',
            'medium': 'Medium Teaser: Provides more context to draw the reader in.',
            'long': 'Long Teaser: A more detailed introductory summary.'
        },
        'key-points': {
            'short': 'Short Key Points: A few main bullet points.',
            'medium': 'Medium Key Points: A list of the most important points.',
            'long': 'Long Key Points: A comprehensive list of takeaways.'
        },
        'headline': {
            // Headline type is documented as a single sentence, so length may not apply.
            // We provide one description and disable the length selector for clarity.
            'short': 'Headline: A concise, single headline for the text.',
            'medium': 'Headline: A concise, single headline for the text.',
            'long': 'Headline: A concise, single headline for the text.'
        }
    };

    // Function to update the settings UI based on current selections
    function updateSettingsUI() {
        const type = summaryTypeSelect.value;
        const length = summaryLengthSelect.value;

        // The 'headline' type produces a single sentence. Disable length to avoid confusion.
        if (type === 'headline') {
            summaryLengthSelect.disabled = true;
            summaryLengthSelect.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            summaryLengthSelect.disabled = false;
            summaryLengthSelect.classList.remove('opacity-50', 'cursor-not-allowed');
        }

        // Update the description text
        if (settingDescriptions[type] && settingDescriptions[type][length]) {
            settingsDescription.textContent = settingDescriptions[type][length];
        }
    }

    // Function to update the status message in the popup
    function updateStatus(message, isError = false) {
        statusMessage.textContent = message;
        statusMessage.className = `text-sm mt-2 text-center ${isError ? 'text-red-600' : 'text-gray-600'}`;
    }

    // Function to enable or disable the summarize button
    function setSummarizeButtonState(enabled) {
        summarizeButton.disabled = !enabled;
        if (enabled) {
            summarizeButton.classList.remove('opacity-50', 'cursor-not-allowed');
            summarizeButton.classList.add('hover:bg-blue-700', 'transform', 'hover:scale-105');
        } else {
            summarizeButton.classList.add('opacity-50', 'cursor-not-allowed');
            summarizeButton.classList.remove('hover:bg-blue-700', 'transform', 'hover:scale-105');
        }
    }

    // Check if the Summarizer API is available when the popup opens
    async function checkApiAvailability() {
        if ('Summarizer' in self) {
            try {
                const availability = await Summarizer.availability();
                if (availability === 'unavailable') {
                    updateStatus('The Summarizer API is available from Chrome 138 stable.', true);
                    setSummarizeButtonState(false);
                    return false;
                } else if (availability === 'downloadable') {
                    updateStatus('Summarizer model needs to be downloaded. This may take a moment when you click summarize.');
                    setSummarizeButtonState(true); // Allow user to click, as create() will trigger download
                } else if (availability === 'available') {
                    updateStatus('Summarizer API is ready.');
                    setSummarizeButtonState(true);
                }
                return true;
            } catch (error) {
                console.error("Error checking Summarizer API availability:", error);
                updateStatus('Error checking AI availability. Ensure Chrome is up-to-date.', true);
                setSummarizeButtonState(false);
                return false;
            }
        } else {
            updateStatus('The Summarizer API is available from Chrome 138 stable.', true);
            setSummarizeButtonState(false);
            return false;
        }
    }

    // Event listener for the Summarize button
    summarizeButton.addEventListener('click', async () => {
        setSummarizeButtonState(false); // Disable button during processing
        summaryOutput.textContent = ''; // Clear previous summary
        copySummaryButton.classList.add('hidden'); // Hide copy button

        // Step 1: Get content from the active tab using a content script
        updateStatus('Getting page content...');
        try {
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
            if (!tab || !tab.id) {
                updateStatus('Could not get active tab information.', true);
                setSummarizeButtonState(true);
                return;
            }

            await chrome.scripting.executeScript({
                target: {tabId: tab.id},
                files: ['content.js']
            });

            const response = await chrome.tabs.sendMessage(tab.id, {action: 'getPageText'});
            const pageText = response ? response.text : '';

            if (!pageText || pageText.trim().length < 100) {
                updateStatus('Not enough content on the page to summarize, or content could not be extracted effectively.', true);
                summaryOutput.textContent = 'Please navigate to an article or page with substantial text content.';
                setSummarizeButtonState(true);
                return;
            }

            // Step 2: Initialize and use the Summarizer API
            const currentAvailability = await checkApiAvailability();
            if (!currentAvailability) {
                updateStatus('Summarizer API is not ready or available.', true);
                setSummarizeButtonState(true);
                return;
            }

            updateStatus('Initializing summarizer...');
            const selectedType = summaryTypeSelect.value;
            const selectedLength = summaryLengthSelect.value;

            const summarizer = await Summarizer.create({
                type: selectedType,
                length: selectedLength,
                format: "plain-text",
                monitor(monitor) {
                    monitor.addEventListener("downloadprogress", (e) => {
                        const progress = (e.loaded * 100).toFixed(0);
                        updateStatus(`Downloading model: ${progress}%`);
                        if (progress === "100") {
                            updateStatus('Model download complete. Summarizing...');
                        }
                    });
                },
            });

            const stream = await summarizer.summarizeStreaming(pageText);
            let summary = "";
            summaryOutput.textContent = ''; // Clear placeholder text before streaming
            updateStatus('Generating summary...');

            // For 'key-points', set CSS to respect newlines we'll be adding.
            if (selectedType === 'key-points') {
                summaryOutput.style.whiteSpace = 'pre-wrap';
            } else {
                summaryOutput.style.whiteSpace = 'normal'; // Reset for other types
            }

            for await (const chunk of stream) {
                summary += chunk;

                if (selectedType === 'key-points') {
                    // To create new lines for bullet points, we replace the asterisk pattern.
                    // This is run on each chunk to give a "live" formatting effect.
                    // 1. Replace the very first asterisk (and optional space) with a bullet.
                    // 2. Replace subsequent " * " patterns with newlines and a bullet.
                    summaryOutput.textContent = summary
                        .replace(/^\*\s?/, '• ')
                        .replace(/\s\*\s/g, '\n\n• ');
                } else {
                    // For other summary types, update the text content directly.
                    summaryOutput.textContent = summary;
                }
            }

            // Step 3: Display the summary
            if (summary) {
                updateStatus('Summary generated successfully!');
                copySummaryButton.classList.remove('hidden');
            } else {
                updateStatus('Could not generate a summary.', true);
                summaryOutput.textContent = 'No summary was returned. The content might be too complex or short for effective summarization.';
            }

        } catch (error) {
            console.error("Error during summarization:", error);
            updateStatus(`An error occurred: ${error.message}`, true);
            summaryOutput.textContent = `Failed to generate summary. Please check the console for details.`;
        } finally {
            setSummarizeButtonState(true); // Re-enable button
        }
    });

    // Event listener for the Copy Summary button
    copySummaryButton.addEventListener('click', () => {
        const textToCopy = summaryOutput.textContent;
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            updateStatus('Summary copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy text: ', err);
            updateStatus('Failed to copy summary.', true);
        } finally {
            document.body.removeChild(textarea);
            setTimeout(() => updateStatus(''), 2000);
        }
    });

    // Add event listeners for settings changes
    summaryTypeSelect.addEventListener('change', updateSettingsUI);
    summaryLengthSelect.addEventListener('change', updateSettingsUI);

    // Initial setup
    updateSettingsUI();
    checkApiAvailability();
});