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
    sendResponse({ status: 'Processing started in the background.' });
  }
  // 'return true' is essential to keep the message channel open for the async response.
  return true;
});

async function summarize(pageText, settings) {
  // Set initial state for processing.
  await updateState({ isProcessing: true, summary: '', status: 'Initializing...' });

  try {
    // 1. Check API Availability
    if (!('Summarizer' in self) || (await Summarizer.availability()) === 'unavailable') {
      throw new Error('Summarizer API is not available.');
    }
    if (!('LanguageDetector' in self) || (await LanguageDetector.availability()) === 'unavailable') {
      throw new Error('LanguageDetector API is not available.');
    }

    // 2. Detect Language
    await updateState({ status: 'Detecting language...' });
    const detector = await LanguageDetector.create();
    const results = await detector.detect(pageText);
    const lang = results[0].detectedLanguage;
    console.log(`Detected language: ${lang}`);

    // 3. Create Summarizer and Handle Model Download
    await updateState({ status: 'Initializing summarizer...' });
    const summarizer = await Summarizer.create({
      ...settings,
      format: "plain-text",
      monitor(monitor) {
        monitor.addEventListener("downloadprogress", (e) => {
          const progress = (e.loaded * 100).toFixed(0);
          updateState({ status: `Downloading model: ${progress}%` });
        });
      },
    });

    // 4. Generate Summary
    await updateState({ status: 'Generating summary...' });
    const stream = await summarizer.summarizeStreaming(pageText);
    let summary = "";
    for await (const chunk of stream) {
      summary += chunk;
    }

    // 5. Store Final Result
    if (summary) {
      await updateState({
        status: 'Summary generated successfully!',
        summary: summary,
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
      summary: 'Failed to generate summary. Please check the console for details.',
      isError: true,
      isProcessing: false,
    });
  }
}