/**
 * Service for interacting with the built-in Chrome Language Detector API.
 * Docs: docs/LANGUAGE_DETECTION_API.md
 */
export class LanguageDetectorService {
  constructor() {
    this.session = null;
  }

  /**
   * Checks if the Language Detector API is available.
   * @returns {Promise<string>} 'readily', 'downloadable', or 'unavailable'
   */
  async getAvailability() {
    try {
      let LanguageDetector;
      if ('LanguageDetector' in self) {
        console.log("LanguageDetector is available.");
        LanguageDetector = self.LanguageDetector;
      } else {
        console.error("LanguageDetector API is not supported in this browser environment.");
        return 'unavailable';
      }
      const runtimeAvailability = await self.LanguageDetector.availability();
      if (runtimeAvailability === 'readily') {
        console.log("Model is cached locally; instantiation is instantaneous.");
      } else if (runtimeAvailability === 'downloadable') {
        console.log("Model requires lazy network download.");
      } else if (runtimeAvailability === 'unavailable') {
        throw new Error("Local language classification is not supported on this platform.");
      }
      return runtimeAvailability;
    } catch (error) {
      console.warn('LanguageDetector.availability() failed:', error);
      return 'unavailable';
    }
  }

  /**
   * Triggers background warm-up.
   */
  async warmUp() {
    const availability = await this.getAvailability();
    if (!navigator.userActivation.isActive) {
      console.warn("Session allocation should be wrapped inside a direct user interaction callback.");
      return
    }
    if (availability === 'downloadable' || availability === 'readily') {
      try {
        await this.init();
      } catch (e) {
        console.warn('Language detector warm-up failed:', e?.message || e);
      }
    }
  }

  /**
   * Initializes the language detector session.
   * @param {Function} onProgress - Callback for download progress.
   * @returns {Promise<LanguageDetectorSession>}
   */
  async init(onProgress = null) {
    const LanguageDetector = self.LanguageDetector;
    try {
      this.session = await LanguageDetector.create({
        monitor(m) {
          m.addEventListener('downloadprogress', (e) => {
            const percentage = e.total ? (e.loaded / e.total) * 100 : 0;
            if (onProgress) onProgress(percentage);
          });
        }
      });
      return this.session;
    } catch (error) {
      const errorMsg = error?.message || 'Unknown error during language detector creation';
      console.error('LanguageDetector: Failed to create session:', errorMsg);
      throw new Error(errorMsg);
    }
  }

  /**
   * Detects the language of the given text.
   * @param {string} text - The text to detect.
   * @returns {Promise<string>} ISO language code.
   */
  async detect(text) {
    try {
      if (!this.session) {
        await this.init();
      }
      const results = await this.session.detect(text);
      if (results && results.length > 0) {
        // Docs show results is an array of { detectedLanguage, confidence }
        return results[0].detectedLanguage;
      }
      return 'en'; // Default fallback
    } catch (error) {
      console.error('Language detection failed:', error);
      return 'en';
    }
  }

  destroy() {
    if (this.session) {
      this.session.destroy();
      this.session = null;
    }
  }
}
