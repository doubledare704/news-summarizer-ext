if (!window.__newsSummarizerLoaded) {
    window.__newsSummarizerLoaded = true;
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

            // Clean up text content
            const cleanedText = textContent
                .replace(/\s+/g, ' ') 
                .trim();              

            sendResponse({text: cleanedText});
        }
        return true; // Keep message channel open for async response if needed
    });
}