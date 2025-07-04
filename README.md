# 📰 News Summarizer & Translator Extension

A powerful Chrome extension that uses AI to summarize web articles and leverages the browser's built-in translation 
engine to translate the summary.

## ✨ Features

-   **One-Click Summarization**: Instantly get a concise summary of any article.
-   **Intelligent Text Extraction**: Automatically finds and uses the main content of an article. You can also 
- summarize just the text you've selected.
-   **Seamless Translation**: After summarizing, a "Translate" button appears, allowing you to translate the English
- summary back into the article's original language (e.g., Spanish, German, Japanese).

---

## 🚀 Installation

Since this is a local development extension, you can install it by following these steps:

1.  **Download the Code**: Clone or download this repository to your local machine.
2.  **Open Chrome Extensions**: In Chrome, navigate to `chrome://extensions`.
3.  **Enable Developer Mode**: In the top-right corner, toggle on **"Developer mode"**.
4.  **Load the Extension**:
    -   Click the **"Load unpacked"** button.
    -   In the file dialog, navigate to and select the root folder of this project.
5.  The extension icon should now appear in your Chrome toolbar. Pin it for easy access!

## 📖 How to Use

1.  Navigate to a news article or any web page with a significant amount of text.
2.  Click the **News Summarizer** icon in your browser's toolbar.
3.  Click the **"Summarize Page"** button.
    -   The extension will analyze the page, extract the main text, and generate a summary.
    -   The summary will appear in the popup.
4.  **To Translate**:
    -   If the article's language is not English, a button like "Translate to `es`" will appear.
    -   Click this button to see the summary translated into the article's original language.

## 🛠️ How It Works & Technical Details

This extension is built using modern Manifest V3 standards for better security and performance. Here’s a brief overview 
of the architecture and key APIs:

-   **`manifest.json`**: The core configuration file. It defines permissions (`scripting`, `i18n`), the service worker,
- and UI components.
-   **`popup.html` / `popup.js`**: The UI and main controller for the extension. The `popup.js` script orchestrates the
- entire process, handling user clicks and managing communication between the other scripts.
-   **`content.js`**: This script is programmatically injected into the active web page using 
- `chrome.scripting.executeScript()`. Its job is to extract the article's text content and determine its language
- using the `chrome.i18n.detectLanguage()` API.
-   **`background.js`**: The service worker. It receives text from the popup and performs the summarization.
    -   **Note**: This implementation uses a placeholder/mock summarization function. It can be extended to integrate
    - with a real AI summarization API (e.g., OpenAI, Gemini).
-   **`navigator.language.translate()`**: An **experimental API** that provides access to the browser's built-in 
- translation engine. This allows for seamless, on-device text translation without needing external API keys or services.

### Data Flow:

1.  User clicks **"Summarize Page"** in the popup.
2.  `popup.js` executes `content.js` on the current tab.
3.  `content.js` grabs the page text, detects its language, and sends this data back to `popup.js`.
4.  `popup.js` sends the extracted text to `background.js`.
5.  `background.js` runs its summarization logic and returns the summary to `popup.js`.
6.  `popup.js` displays the summary. If the original language was not English, it also shows the "Translate" button.
7.  If the user clicks "Translate", `popup.js` calls `navigator.language.translate()` to get the translation and 
8. updates the UI.