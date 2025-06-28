// popup.js: Handles the logic for the extension popup
document.addEventListener('DOMContentLoaded', () => {
    const summarizeButton = document.getElementById('summarizeButton');
    const summaryOutput = document.getElementById('summaryOutput');
    const statusMessage = document.getElementById('statusMessage');
    const copySummaryButton = document.getElementById('copySummaryButton');

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
            // Execute content.js in the active tab to get its text content
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
            if (!tab || !tab.id) {
                updateStatus('Could not get active tab information.', true);
                setSummarizeButtonState(true);
                return;
            }

            // Inject content.js if it's not already injected (important for pages where it might not run automatically)
            // This is safer than relying on "matches" in manifest for single-click actions
            await chrome.scripting.executeScript({
                target: {tabId: tab.id},
                files: ['content.js']
            });

            // Send a message to the content script to request the text content
            const response = await chrome.tabs.sendMessage(tab.id, {action: 'getPageText'});
            const pageText = response ? response.text : '';

            if (!pageText || pageText.trim().length < 100) { // Require minimum length for summarization
                updateStatus('Not enough content on the page to summarize, or content could not be extracted effectively.', true);
                summaryOutput.textContent = 'Please navigate to an article or page with substantial text content.';
                setSummarizeButtonState(true);
                return;
            }

            // Step 2: Initialize and use the Summarizer API
            // Check availability again right before creating, in case status changed
            const currentAvailability = await checkApiAvailability();
            let summarizer;

            if (currentAvailability === true) {
                updateStatus('Downloading summarizer model...');
                summarizer = await Summarizer.create({
                    type: 'key-points',
                    length: 'medium',
                    format: "plain-text",
                    monitor(monitor) {
                        monitor.addEventListener("downloadprogress", (e) => {
                            updateStatus(`Downloading model: ${(e.loaded * 100).toFixed(0)}%`);
                            console.log(`Downloaded ${Math.floor(e.loaded * 100)}%`);
                            if (e.loaded * 100 === 100) {
                                updateStatus('Model download complete. Summarizing...');
                            }
                        });
                    },
                });
            } else {
                updateStatus('Summarizer API is not ready or available.', true);
                setSummarizeButtonState(true);
                return;
            }

            const stream = await summarizer.summarizeStreaming(pageText);
            let summary = "";
            for await (const chunk of stream) {
                summary += chunk;
                summaryOutput.textContent += chunk;
                updateStatus('Summary generating...');
            }
            // Step 3: Display the summary
            if (summary) {
                summaryOutput.textContent = summary;
                updateStatus('Summary generated successfully!');
                copySummaryButton.classList.remove('hidden'); // Show copy button
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
        // Use document.execCommand('copy') as navigator.clipboard.writeText() might not work in iframes/extensions due to security contexts.
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
            setTimeout(() => updateStatus(''), 2000); // Clear message after 2 seconds
        }
    });

    // Initial check for API availability when the popup is loaded
    checkApiAvailability();
});