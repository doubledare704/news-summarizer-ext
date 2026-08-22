/**
 * Service for interacting with the built-in Chrome Translator API.
 * Docs: docs/TRANSLATION_API.md
 */
export class TranslatorService {
  constructor() {
    this.session = null;
  }

  /**
   * Checks if the Translator API is available for a specific language pair.
   * @param {string} sourceLanguage - ISO language code.
   * @param {string} targetLanguage - ISO language code.
   * @returns {Promise<string>} 'readily', 'downloadable', or 'unavailable'
   */
  async getAvailability(sourceLanguage = 'en', targetLanguage = 'es') {
    try {
      const Translator = self.Translator || (window.ai && window.ai.translator);
      if (!Translator) return 'unavailable';
      if (Translator.availability) {
        return await Translator.availability({ sourceLanguage, targetLanguage });
      } else if (Translator.capabilities) {
        const capabilities = await Translator.capabilities({ sourceLanguage, targetLanguage });
        return capabilities.available;
      }
      return 'unavailable';
    } catch (error) {
      console.warn('Translator.availability() failed:', error);
      return 'unavailable';
    }
  }

  /**
   * Checks if the Translator API is available for a specific language pair.
   */
  async isAvailable(sourceLanguage = 'en', targetLanguage = 'es') {
    const availability = await this.getAvailability(sourceLanguage, targetLanguage);
    return availability !== 'unavailable';
  }

  /**
   * Translates text to a target language.
   */
  async translate(text, sourceLanguage, targetLanguage, onProgress = null) {
    try {
      const options = {
        sourceLanguage,
        targetLanguage,
        monitor(m) {
          if (onProgress) {
            m.addEventListener('downloadprogress', (e) => {
              const percentage = e.total ? (e.loaded / e.total) * 100 : 0;
              onProgress(percentage);
            });
          }
        }
      };

      const translator = await self.Translator.create(options);
      const result = await translator.translate(text);
      await translator.destroy(); 
      return result;
    } catch (error) {
      console.error('Translation failed:', error);
      throw error;
    }
  }

  /**
   * Translates text and streams the results.
   */
  async translateStreaming(text, sourceLanguage, targetLanguage, onChunk, onProgress = null) {
    try {
      const options = {
        sourceLanguage,
        targetLanguage,
        monitor(m) {
          if (onProgress) {
            m.addEventListener('downloadprogress', (e) => {
              const percentage = e.total ? (e.loaded / e.total) * 100 : 0;
              onProgress(percentage);
            });
          }
        }
      };

      const translator = await self.Translator.create(options);
      const stream = translator.translateStreaming(text);
      
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
      
      await translator.destroy();
      return fullText;
    } catch (error) {
      console.error('Streaming translation failed:', error);
      throw error;
    }
  }
}
