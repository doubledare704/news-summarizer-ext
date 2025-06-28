// background.js: Handles long-running summarization tasks.

// This function updates the shared state in chrome.storage.local.
// The popup listens for these changes to update its UI.
async function updateState(newState) {
    await chrome.storage.local.set(newState);
}

// Listen for a message from the popup to start the summarization process.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'summarize') {
        // Start the async summarization process.
        summarize(request.text, request.settings);
        // Immediately respond to the popup to confirm the task has been received.
        sendResponse({status: 'Processing started in the background.'});
    } else if (request.action === 'translate') {
        // Start the translation process
        translateText(request.text, request.targetLanguage);
        // Immediately respond to confirm task received
        sendResponse({status: 'Translation started in the background.'});
    } else if (request.action === 'detectLanguage') {
        // Start the language detection process
        detectLanguage(request.text);
        // Immediately respond to confirm task received
        sendResponse({status: 'Language detection started in the background.'});
    }
    // 'return true' is essential to keep the message channel open for the async response.
    return true;
});

async function detectLanguage(text) {
    // Set initial state for processing
    await updateState({isDetecting: true, detectedLanguage: '', status: 'Detecting language...', isError: false});

    try {
        // Check API availability
        if (!('LanguageDetector' in self) || (await LanguageDetector.availability()) === 'unavailable') {
            throw new Error('Language Detector API is not available. It works in Chrome 138+. Please update Chrome.');
        }

        // Create LanguageDetector and handle model download
        await updateState({status: 'Initializing language detector...'});
        const languageDetector = await LanguageDetector.create({
            monitor(monitor) {
                monitor.addEventListener("downloadprogress", (e) => {
                    const progress = (e.loaded * 100).toFixed(0);
                    updateState({status: `Downloading language detection model: ${progress}%`});
                });
            },
        });

        // Detect language
        await updateState({status: 'Detecting language...'});
        const detectionResult = await languageDetector.detect(text);
        console.log("Detection result:", detectionResult);
        // Get the language with highest confidence
        if (detectionResult && detectionResult.length > 0) {
            // Sort by confidence (highest first)
            const sortedResults = [...detectionResult].sort((a, b) => b.confidence - a.confidence);
            const topResult = sortedResults[0];

            await updateState({
                status: `Language detected: ${topResult.detectedLanguage} (${(topResult.confidence * 100).toFixed(1)}%)`,
                detectedLanguage: topResult.detectedLanguage,
                isDetecting: false,
                isError: false
            });

            return topResult.detectedLanguage;
        } else {
            throw new Error('Could not detect language.');
        }
    } catch (error) {
        console.error("Error in language detection:", error);
        await updateState({
            status: `An error occurred during language detection: ${error.message}`,
            isDetecting: false,
            isError: true
        });
    }
}

async function translateText(text, targetLanguage) {
    // Set initial state for processing
    await updateState({isTranslating: true, translatedText: '', status: 'Initializing translation...', isError: false});

    try {
        // Check API availability
        if (!('Translator' in self) || (await Translator.availability({
            sourceLanguage: 'en',
            targetLanguage: targetLanguage
        })) === 'unavailable') {
            throw new Error('Translator API is not available. It works in Chrome 138+. Please update Chrome.');
        }

        // Create Translator and handle model download
        await updateState({status: 'Initializing translator...'});
        const translator = await Translator.create({
            sourceLanguage: 'en',  // Auto-detect source language
            targetLanguage: targetLanguage,
            monitor(monitor) {
                monitor.addEventListener("downloadprogress", (e) => {
                    const progress = (e.loaded * 100).toFixed(0);
                    updateState({status: `Downloading translation model: ${progress}%`});
                });
            },
        });

        // Translate text and stream updates
        await updateState({status: 'Translating text...'});
        const result = await translator.translate(text);

        if (result) {
            await updateState({
                status: 'Translation completed successfully!',
                translatedText: result,
                isTranslating: false,
                isError: false
            });
        } else {
            throw new Error('Could not translate text.');
        }
    } catch (error) {
        console.error("Error in translation:", error);
        await updateState({
            status: `An error occurred during translation: ${error.message}`,
            translatedText: 'Failed to translate text. Please try again or check the console.',
            isTranslating: false,
            isError: true
        });
    }
}

async function summarize(pageText, settings) {
    // Set initial state for processing.
    await updateState({isProcessing: true, summary: '', translatedText: '', status: 'Initializing...', isError: false});

    try {
        // 1. Check API Availability
        if (!('Summarizer' in self) || (await Summarizer.availability()) === 'unavailable') {
            throw new Error('Summarizer API is not available. It works in Chrome 138+. Please update Chrome.');
        }
        // LanguageDetector check can be removed if not strictly needed for summarization
        // or handled more gracefully.
        if ('LanguageDetector' in self && (await LanguageDetector.availability()) !== 'available') {
            console.warn('LanguageDetector not available, proceeding without it.');
        }

        // 2. Create Summarizer and Handle Model Download
        await updateState({status: 'Initializing summarizer...'});
        const summarizer = await Summarizer.create({
            ...settings,
            format: "plain-text",
            monitor(monitor) {
                monitor.addEventListener("downloadprogress", (e) => {
                    const progress = (e.loaded * 100).toFixed(0);
                    updateState({status: `Downloading model: ${progress}%`});
                });
            },
        });

        // 3. Generate Summary and Stream Updates
        await updateState({status: 'Generating summary...'});
        const stream = await summarizer.summarizeStreaming(pageText);
        let summary = "";
        for await (const chunk of stream) {
            summary += chunk;
            // This is the key change: update storage with the partial summary.
            // This triggers the onChanged listener in popup.js for a live UI update.
            await updateState({summary: summary});
        }

        // 4. Store Final Result
        if (summary) {
            // Once streaming is complete, set the final state.
            await updateState({
                status: 'Summary generated successfully!',
                isError: false,
                isProcessing: false,
                settings: settings // Save settings used for this summary
            });
        } else {
            throw new Error('Could not generate a summary.');
        }
    } catch (error) {
        console.error("Error in background summarization:", error);
        await updateState({
            status: `An error occurred: ${error.message}`,
            summary: 'Failed to generate summary. Please try again or check the console.',
            isError: true,
            isProcessing: false,
        });
    }
}