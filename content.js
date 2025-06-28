// content.js: Runs on the active tab's page to extract content
// This script is injected and executed by popup.js when the summarize button is clicked.

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getPageText') {
        // Try to get selected text first
        let textContent = window.getSelection().toString();

        // If no text is selected, try to get readable text from common article elements
        if (!textContent || textContent.trim().length === 0) {
            // Prioritize elements likely to contain main article content
            const articleElements = document.querySelectorAll('article, main, .post-content, .entry-content, .article-body, #main-content, #content');
            let foundText = '';
            for (const element of articleElements) {
                // Heuristic: check if the element has significant text
                if (element.innerText && element.innerText.length > 500) {
                    foundText = element.innerText;
                    break;
                }
            }

            // Fallback to body innerText if no specific article element is found or has enough text
            if (!foundText) {
                foundText = document.body.innerText;
            }
            textContent = foundText;
        }

        // Clean up text content: remove excessive whitespace and leading/trailing spaces
        // This helps the summarizer focus on meaningful content
        const cleanedText = textContent
            .replace(/\s+/g, ' ') // Replace multiple whitespaces (including newlines) with single space
            .trim();              // Remove leading/trailing whitespace

        sendResponse({text: cleanedText});
    }
});