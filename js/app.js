import { SummarizerService } from './services/SummarizerService.js';
import { TranslatorService } from './services/TranslatorService.js';
import { LanguageDetectorService } from './services/LanguageDetectorService.js';
import { ContentService } from './services/ContentService.js';
import { SidePanelUI } from './ui/SidePanelUI.js';

class App {
  constructor() {
    this.summarizer = new SummarizerService();
    this.translator = new TranslatorService();
    this.detector = new LanguageDetectorService();
    this.content = new ContentService();
    this.ui = new SidePanelUI();
    
    this.currentSummary = '';
    this.currentTitle = '';
    this.sourceLanguage = 'en';
    this.isWarmingUp = false;
    this.lastSummarizedUrl = '';
    
    this.init();
  }

  async init() {
    // Basic Button listeners
    this.ui.elements.summarizeBtn.addEventListener('click', () => this.handleSummarize());
    this.ui.elements.copyBtn.addEventListener('click', () => this.handleCopy());
    this.ui.elements.translateBtn.addEventListener('click', () => this.handleTranslate());
    this.ui.elements.regenerateBtn.addEventListener('click', () => this.handleSummarize());

    // Settings Toggle listeners
    this.ui.elements.settingsBtn.addEventListener('click', () => this.ui.toggleSettings(true));
    this.ui.elements.closeSettingsBtn.addEventListener('click', () => this.ui.toggleSettings(false));

    // Reset UI when tab changes or navigates
    chrome.tabs.onActivated.addListener(() => this.ui.resetUI());
    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
      if (changeInfo.status === 'loading' && tab.active) {
        this.ui.resetUI();
      }
      
      if (changeInfo.status === 'complete' && tab.active && tab.url) {
        const options = this.ui.getOptions();
        if (options.autoSummarize && tab.url !== this.lastSummarizedUrl && !tab.url.startsWith('chrome://')) {
          console.log('Auto-summarizing new page:', tab.url);
          this.handleSummarize();
        }
      }
    });

    // Settings Change Persistence
    const saveSettings = () => {
      const options = this.ui.getOptions();
      chrome.storage.local.set({ newsSummarizerSettings: options });
    };

    this.ui.elements.titleLengthSelect.addEventListener('change', saveSettings);
    this.ui.elements.summaryTypeSelect.addEventListener('change', saveSettings);
    this.ui.elements.summaryLengthSelect.addEventListener('change', saveSettings);
    this.ui.elements.autoSummarizeToggle.addEventListener('change', saveSettings);
    this.ui.elements.targetLangSelect.addEventListener('change', saveSettings);

    // Load persisted settings
    chrome.storage.local.get(['newsSummarizerSettings'], (result) => {
      if (result.newsSummarizerSettings) {
        this.ui.setOptions(result.newsSummarizerSettings);
      }
    });

    // Start warming up models in the background
    this.warmUpModels();
  }

  async warmUpModels() {
    this.isWarmingUp = true;
    console.log('Starting background model warm-up...');
    try {
      // Warm up both in parallel
      await Promise.allSettled([
        this.detector.warmUp(),
        this.summarizer.warmUp()
      ]);
      console.log('Background warm-up complete.');
    } catch (error) {
      console.warn('Background warm-up encountered issues:', error);
    } finally {
      this.isWarmingUp = false;
    }
  }

  async handleSummarize() {
    if (this.ui.isLoading) return; // Prevent double clicks
    
    this.ui.clearContent();
    this.ui.setLoading(true, 'Extracting content...');
    this.currentSummary = '';
    this.currentTitle = '';

    try {
      const { text, url } = await this.content.getActivePageContent();
      if (!text) throw new Error('No content could be extracted from the page.');
      
      this.lastSummarizedUrl = url;
      const options = this.ui.getOptions();
      
      // Step 1: Detect Language
      const availability = await this.detector.getAvailability();
      let detectedLang = 'en';
      if (availability !== 'unavailable') {
        this.ui.updateProgress(0, 'Identifying page language...');
        await this.detector.init((progress) => {
          this.ui.updateProgress(progress, 'Downloading language models...');
        });
        detectedLang = await this.detector.detect(text.substring(0, 1000));
        console.log('Detected language:', detectedLang);
      }
      this.sourceLanguage = detectedLang;
      
      // Step 2: Generate Title (Headline)
      this.ui.updateProgress(100, 'Generating catchy title...');
      await this.summarizer.createSession({
        type: 'headline',
        length: options.titleLength,
        expectedInputLanguages: [detectedLang]
      }, (progress) => {
        this.ui.updateProgress(progress, 'Downloading AI models...');
      });

      this.currentTitle = await this.summarizer.summarize(text);
      this.ui.displayTitle(this.currentTitle);

      // Step 3: Generate Summary Body
      this.ui.setLoading(true, 'Synthesizing key points...'); // Show overlay again for body gen
      this.ui.updateProgress(100, 'Generating summary body...');
      
      await this.summarizer.createSession({
        type: options.summaryType,
        length: options.summaryLength,
        expectedInputLanguages: [detectedLang]
      });

      let hasReceivedChunk = false;
      await this.summarizer.summarizeStreaming(text, {}, (chunk) => {
        if (!chunk) return;
        if (!hasReceivedChunk) hasReceivedChunk = true;
        this.currentSummary = chunk;
        this.ui.displaySummary(this.currentSummary);
      });
      
      if (!hasReceivedChunk) {
        throw new Error('AI returned an empty summary.');
      }

      console.log('Summarization complete.');

    } catch (error) {
      console.error('Summarization flow failed:', error);
      this.ui.showError(error?.message || 'Failed to generate summary');
    } finally {
      this.ui.setLoading(false);
    }
  }

  async handleTranslate() {
    if (!this.currentSummary && !this.currentTitle) return;

    const options = this.ui.getOptions();
    const targetLanguage = options.targetLanguage || 'es';

    this.ui.elements.translateBtn.disabled = true;
    const originalBtnText = this.ui.elements.translateBtn.querySelector('span').textContent;
    this.ui.elements.translateBtn.querySelector('span').textContent = 'Translating...';

    try {
      const ready = await this.translator.isAvailable(this.sourceLanguage, targetLanguage);
      if (!ready) throw new Error(`Translation from ${this.sourceLanguage.toUpperCase()} to ${targetLanguage.toUpperCase()} is not supported.`);

      // Step 1: Translate Title if exists
      if (this.currentTitle) {
        this.ui.updateProgress(0, 'Preparing translation...');
        const translatedTitle = await this.translator.translate(
          this.currentTitle, 
          this.sourceLanguage, 
          targetLanguage,
          (progress) => this.ui.updateProgress(progress, `Downloading translation model...`)
        );
        this.currentTitle = translatedTitle;
        this.ui.displayTitle(this.currentTitle);
      }

      // Step 2: Translate Summary
      if (this.currentSummary) {
        this.ui.updateProgress(0, 'Translating content...');
        let translatedSummary = '';
        await this.translator.translateStreaming(
          this.currentSummary, 
          this.sourceLanguage, 
          targetLanguage, 
          (chunk) => {
            if (!chunk) return;
            translatedSummary = chunk;
            this.ui.displaySummary(translatedSummary);
          },
          (progress) => this.ui.updateProgress(progress, `Downloading translation model...`)
        );
        this.currentSummary = translatedSummary;
      }
      
    } catch (error) {
      console.error('Translation failed:', error);
      alert(error.message);
    } finally {
      this.ui.elements.translateBtn.disabled = false;
      this.ui.elements.translateBtn.querySelector('span').textContent = originalBtnText;
      this.ui.updateProgress(100); // Clear progress
    }
  }

  handleCopy() {
    const textToCopy = `${this.currentTitle}\n\n${this.currentSummary}`;
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      const originalText = this.ui.elements.copyBtn.querySelector('span').textContent;
      this.ui.elements.copyBtn.querySelector('span').textContent = 'Copied!';
      setTimeout(() => {
        this.ui.elements.copyBtn.querySelector('span').textContent = originalText;
      }, 2000);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new App();
});
