# 📰 News Summarizer & Translator Extension (v3.0)

A modern Chrome extension that leverages built-in on-device AI for summarization and translation, now featuring a sleek side panel interface.

## ✨ Features

-   **Side Panel Interface**: Seamlessly integrated into the Chrome side panel, allowing you to browse and summarize simultaneously.
-   **On-Device AI Summarization**: Uses the built-in `window.ai.summarizer` API for fast, private, and secure summarization without external API calls.
-   **Built-in Translation**: Leverages the `window.ai.translator` API to translate summaries instantly.
-   **Modern Design**: Built with a "Glacier Light" aesthetic using Tailwind CSS and glassmorphic effects.
-   **Flexible Options**: Choose summary styles (Bullet Points, Paragraph, Key Takeaways) and lengths (Brief, Medium, Detailed).
-   **Smart Extraction**: Automatically detects main article content or uses your current text selection.

## 🚀 Installation

1.  **Prerequisites**:
    -   Requires Chrome 131 or later.
    -   Ensure "AI on Chrome" flags are enabled (visit `chrome://flags/#summarizer-api-for-gemini-nano` and `chrome://flags/#translator-api-for-gemini-nano`).
2.  **Download the Code**: Clone or download this repository.
3.  **Open Chrome Extensions**: Navigate to `chrome://extensions`.
4.  **Enable Developer Mode**: Toggle it on in the top-right corner.
5.  **Load the Extension**: Click **"Load unpacked"** and select the root folder of this project.

## 📖 How to Use

1.  Click the **News Summarizer** icon in your toolbar to open the **Side Panel**.
2.  Navigate to any news article.
3.  Select your desired **Style** and **Length**.
4.  Click **"Generate Summary"**.
5.  Use the action bar at the bottom to **Copy**, **Share**, or **Translate** the summary.

## 🛠️ Technical Architecture (SOLID)

The extension has been refactored for clarity and extensibility:

-   **`js/services/`**:
    -   `SummarizerService.js`: Encapsulates `window.ai.summarizer` logic.
    -   `TranslatorService.js`: Encapsulates `window.ai.translator` logic.
    -   `ContentService.js`: Manages content extraction and script injection.
-   **`js/ui/`**:
    -   `SidePanelUI.js`: Pure UI management, handling DOM state and styling.
-   **`js/app.js`**: Orchestrates services and UI interactions.
-   **`background.js`**: Manages side panel behavior and installation lifecycle.
-   **`manifest.json`**: Updated to MV3 with `sidePanel` and AI API permissions.

## 🔒 Privacy

All processing happens locally on your device using Chrome's built-in AI models. Your data never leaves your browser.