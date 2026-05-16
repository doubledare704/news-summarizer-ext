/**
 * Service for interacting with the built-in Chrome Summarizer API.
 * Docs: docs/SUMMARIZER_API.md
 */
export class SummarizerService {
  constructor() {
    this.session = null;
  }

  /**
   * Checks if the Summarizer API is available.
   * @returns {Promise<string>} 'readily', 'downloadable', or 'unavailable'
   */
  async getAvailability() {
    try {
      const Summarizer = self.Summarizer || (window.ai && window.ai.summarizer);
      if (!Summarizer) return 'unavailable';
      if (Summarizer.availability) {
        return await Summarizer.availability();
      } else if (Summarizer.capabilities) {
        const capabilities = await Summarizer.capabilities();
        return capabilities.available;
      }
      return 'unavailable';
    } catch (error) {
      console.warn('Summarizer.availability() failed:', error);
      return 'unavailable';
    }
  }

  /**
   * Checks if the Summarizer API is available.
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    const availability = await this.getAvailability();
    return availability !== 'unavailable';
  }

  /**
   * Triggers background model download/warm-up.
   */
  async warmUp() {
    const availability = await this.getAvailability();
    if (availability === 'downloadable' || availability === 'readily') {
      if (!navigator.userActivation?.isActive) {
        console.warn("Session allocation should be wrapped inside a direct user interaction callback.");
        return;
      }
      try {
        await this.createSession();
      } catch (e) {
        console.warn('Summarizer warm-up failed:', e?.message || e);
      }
    }
  }

  /**
   * Creates a summarizer session with specified options.
   * @param {Object} options - SummarizerOptions.
   * @param {Function} onProgress - Callback for download progress.
   */
  async createSession(options = {}, onProgress = null) {
    const Summarizer = self.Summarizer || (window.ai && window.ai.summarizer);
    if (!Summarizer) {
      throw new Error('Summarizer API not supported in this browser.');
    }

    const defaults = {
      sharedContext: 'This is a web article or news page.',
      type: 'key-points',
      format: 'markdown',
      length: 'medium',
      outputLanguage: 'en',
    };

    if (this.session) {
      try {
        this.session.destroy();
      } catch (e) { }
      this.session = null;
    }

    try {
      console.log('Summarizer: options:', options);
      const createOptions = { ...defaults, ...options };

      // Map 'tl;dr' to 'tldr' if needed (docs say 'tldr')
      if (createOptions.type === 'tl;dr') createOptions.type = 'tldr';

      if (onProgress) {
        createOptions.monitor = (m) => {
          m.addEventListener('downloadprogress', (e) => {
            console.log(`[DEBUG] Summarizer download: ${e.loaded} / ${e.total}`);
            const percentage = e.total ? (e.loaded / e.total) * 100 : 0;
            onProgress(percentage);
          });
        };
      }

      console.log('Summarizer: Calling .create() with:', createOptions);
      this.session = await Summarizer.create(createOptions);
      return this.session;
    } catch (error) {
      const errorMsg = error?.message || 'Unknown error during summarizer creation';
      console.error('Summarizer: Failed to create session:', errorMsg);
      throw new Error(errorMsg);
    }
  }

  /**
   * Summarizes the given text.
   * @param {string} text - The text to summarize.
   * @param {Object} options - Optional context for this specific summarization.
   * @returns {Promise<string>}
   */
  async summarize(text, options = {}) {
    if (!this.session) {
      await this.createSession();
    }

    try {
      // Docs: summarize(text, { context })
      return await this.session.summarize(text, options);
    } catch (error) {
      console.error('Summarization failed:', error);
      throw error;
    }
  }

  /**
   * Summarizes the given text and streams the results.
   * @param {string} text - The text to summarize.
   * @param {Object} options - Optional context for this specific summarization.
   * @param {Function} onChunk - Callback for each text chunk.
   */
  async summarizeStreaming(text, options = {}, onChunk) {
    if (!this.session) {
      await this.createSession();
    }

    try {
      const stream = this.session.summarizeStreaming(text, options);
      let fullText = '';
      for await (const chunk of stream) {
        // Handle both incremental and full-string streaming styles
        if (chunk.startsWith(fullText)) {
          fullText = chunk;
        } else {
          fullText += chunk;
        }
        if (onChunk) onChunk(fullText);
      }
      return fullText;
    } catch (error) {
      console.error('Streaming summarization failed:', error);
      throw error;
    }
  }

  destroy() {
    if (this.session) {
      this.session.destroy();
      this.session = null;
    }
  }
}
