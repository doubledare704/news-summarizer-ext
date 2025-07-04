# News Summarizer & Translator Extension

A powerful Chrome extension that uses AI to summarize web articles and leverages the browser's built-in capabilities to translate the summary into the article's original language.

## Features

-   **One-Click Summarization**: Instantly get a concise summary of the article you're reading.
-   **Intelligent Text Extraction**: Automatically finds the main content of an article, or uses your selected text.
-   **Seamless Translation**: After summarizing, a "Translate" button appears, allowing you to translate the English summary back to the article's detected language (e.g., Spanish, German, Japanese).


## Installation

- Extension will work only in Chrome 138+ or Edge with enabled feature flags.

Since this is a local development extension, you can install it by following these steps:

1.  **Download the Code**: Download or clone this repository to your local machine.
2.  **Open Chrome Extensions**: Open Google Chrome and navigate to `chrome://extensions`.
3.  **Enable Developer Mode**: In the top-right corner of the Extensions page, toggle on "Developer mode".
4.  **Load the Extension**:
    -   Click the **"Load unpacked"** button that appears on the top-left.
    -   In the file selection dialog, navigate to the folder where you downloaded the extension's code and select it.
5.  The extension icon should now appear in your Chrome toolbar.

## How to Use

1.  Navigate to a news article or any web page with a substantial amount of text.
2.  Click the **News Summarizer & Translator** icon in your browser's toolbar to open the popup.
3.  Click the **"Summarize Page"** button.
    -   The extension will analyze the page, extract the main text, and generate a summary.
    -   The summary will appear in the popup.
4.  **To Translate**:
    -   If the extension detects that the article's language is not English, a new button will appear (e.g., "Translate to es").
    -   Click this button to see the summary translated into the article's original language.

## Project File Structure

Here is a brief overview of the key files in this extension:

-   **`manifest.json`**: The core configuration file for the Chrome extension. It defines permissions (`scripting`, `i18n`), the service worker, and UI components.
-   **`popup.html`**: The HTML structure for the extension's popup window, including buttons and text containers.
-   **`popup.js`**: The main logic for the popup. It handles user clicks, orchestrates communication between the content script and background script, and calls the `navigator.language.translate()` API.
-   **`background.js`**: The service worker that runs in the background. Its primary role is to receive text and perform the summarization (in this version, it's a mock API call).
-   **`content.js`**: A script injected into the active web page. It is responsible for extracting the article's text content and using `chrome.i18n.detectLanguage` to determine its language.

## Technical Details

This extension is built using modern web extension standards and APIs:

-   **Manifest V3**: Ensures better performance, security, and privacy by using a service worker (`background.js`) and a more declarative API structure.
-   **`chrome.scripting.executeScript()`**: Used to programmatically inject `content.js` into the active tab, which is a more secure method than older manifest versions.
-   **`chrome.i18n.detectLanguage()`**: A browser-native API to detect the language of a given text string with high accuracy.
-   **`navigator.language.translate()`**: An **experimental API** that provides access to the browser's built-in translation engine, allowing for seamless, on-device text translation without external API keys.