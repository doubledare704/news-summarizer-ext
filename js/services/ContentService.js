/**
 * Service for extracting content from the active tab.
 */
export class ContentService {
  /**
   * Gets the text content of the active tab.
   * @returns {Promise<{text: string, url: string, title: string}>}
   */
  async getActivePageContent() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) throw new Error('No active tab found');

      // Use executeScript with a function to avoid file loading issues in dev environments
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          // Try to get selected text first
          let textContent = window.getSelection().toString();

          // If no text is selected, try to get readable text from common article elements
          if (!textContent || textContent.trim().length === 0) {
            const articleElements = document.querySelectorAll('article, main, .post-content, .entry-content, .article-body, #main-content, #content');
            let foundText = '';
            for (const element of articleElements) {
              if (element.innerText && element.innerText.length > 500) {
                foundText = element.innerText;
                break;
              }
            }
            if (!foundText) foundText = document.body.innerText;
            textContent = foundText;
          }

          // Clean up text content
          return textContent.replace(/\s+/g, ' ').trim();
        }
      });

      const text = results[0].result;
      if (!text) throw new Error('Failed to extract page text');

      return {
        text,
        url: tab.url,
        title: tab.title
      };
    } catch (error) {
      console.error('Content extraction failed:', error);
      throw error;
    }
  }
}
