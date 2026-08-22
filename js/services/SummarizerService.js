/**
 * Service for interacting with the built-in Chrome Summarizer API.
 * Docs: docs/SUMMARIZER_API.md
 */
export class SummarizerService {
  constructor() {
    this.sessions = new Map();
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
        await this.getOrCreateSession();
      } catch (e) {
        console.warn('Summarizer warm-up failed:', e?.message || e);
      }
    }
  }

  /**
   * Gets a cached session or creates a new one with specified options.
   * @param {Object} options - SummarizerOptions.
   * @param {Function} onProgress - Callback for download progress.
   */
  async getOrCreateSession(options = {}, onProgress = null) {
    const Summarizer = self.Summarizer;
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

    const createOptions = { ...defaults, ...options };
    if (createOptions.type === 'tl;dr') createOptions.type = 'tldr';

    const SUPPORTED_LANGUAGES = new Set(['de', 'en', 'es', 'fr', 'ja']);
    if (createOptions.expectedInputLanguages) {
      createOptions.expectedInputLanguages = createOptions.expectedInputLanguages.map(
        lang => SUPPORTED_LANGUAGES.has(lang) ? lang : 'en'
      );
    }
    if (createOptions.outputLanguage && !SUPPORTED_LANGUAGES.has(createOptions.outputLanguage)) {
      createOptions.outputLanguage = 'en';
    }

    const sessionKey = JSON.stringify(createOptions);

    if (this.sessions.has(sessionKey)) {
      return this.sessions.get(sessionKey);
    }

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
    try {
      const session = await Summarizer.create(createOptions);
      this.sessions.set(sessionKey, session);
      return session;
    } catch (error) {
      const errorMsg = error?.message || 'Unknown error during summarizer creation';
      console.error('Summarizer: Failed to create session:', errorMsg);
      throw new Error(errorMsg);
    }
  }

  /**
   * Summarizes the given text.
   * @param {string} text - The text to summarize.
   * @param {Object} options - Options for the summarizer session.
   * @param {Function} onProgress - Callback for download progress.
   * @returns {Promise<string>}
   */
  async summarize(text, options = {}, onProgress = null) {
    const session = await this.getOrCreateSession(options, onProgress);
    try {
      return await session.summarize(text);
    } catch (error) {
      console.error('Summarization failed:', error);
      throw error;
    }
  }

  /**
   * Summarizes the given text and streams the results.
   * @param {string} text - The text to summarize.
   * @param {Object} options - Options for the summarizer session.
   * @param {Function} onChunk - Callback for each text chunk.
   * @param {Function} onProgress - Callback for download progress.
   */
  async summarizeStreaming(text, options = {}, onChunk, onProgress = null) {
    const session = await this.getOrCreateSession(options, onProgress);
    try {
      const stream = session.summarizeStreaming(text);
      let fullText = '';
      for await (const chunk of stream) {
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
    for (const session of this.sessions.values()) {
      try {
        session.destroy();
      } catch (e) { }
    }
    this.sessions.clear();
  }
}
