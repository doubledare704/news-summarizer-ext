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
    this.sourceLanguage = 'en';
    this.isWarmingUp = false;
    
    this.init();
  }

  async init() {
    this.ui.elements.summarizeBtn.addEventListener('click', () => this.handleSummarize());
    this.ui.elements.copyBtn.addEventListener('click', () => this.handleCopy());
    this.ui.elements.translateBtn.addEventListener('click', () => this.handleTranslate());

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
    
    this.ui.setLoading(true, 'Extracting content...');
    this.currentSummary = '';
    this.ui.elements.summaryContent.innerHTML = '';

    try {
      console.log('[DEBUG] Step 1: Getting content');
      const { text } = await this.content.getActivePageContent();
      if (!text) throw new Error('No content could be extracted from the page.');
      
      console.log('[DEBUG] Step 2: Detecting language');
      const availability = await this.detector.getAvailability();
      
      let detectedLang = 'en';
      if (availability !== 'unavailable') {
        if (availability === 'downloadable') {
          this.ui.updateProgress(0, 'Downloading language models (this may take a minute)...');
        } else {
          this.ui.updateProgress(0, 'Identifying page language...');
        }

        console.log('[DEBUG] Step 2.1: Init detector');
        await this.detector.init((progress) => {
          this.ui.updateProgress(progress, 'Downloading language models...');
        });

        console.log('[DEBUG] Step 2.2: Detect text');
        detectedLang = await this.detector.detect(text.substring(0, 1000));
        console.log('Detected language:', detectedLang);
      } else {
        console.log('Language detector unavailable. Defaulting to English.');
      }
      
      console.log('[DEBUG] Step 3: Setup Summarizer session');
      const summarizerAvailability = await this.summarizer.getAvailability();
      
      if (summarizerAvailability === 'unavailable') {
        throw new Error('Summarizer AI is not available or supported on your device.');
      }
      
      if (this.sourceLanguage !== detectedLang || !this.summarizer.session) {
        this.sourceLanguage = detectedLang;
        
        const statusMsg = summarizerAvailability === 'downloadable' 
          ? 'Downloading AI summarization model...' 
          : `Optimizing AI for ${detectedLang.toUpperCase()}...`;
          
        this.ui.updateProgress(0, statusMsg);
        
        const options = {
          ...this.ui.getOptions(),
          expectedInputLanguages: [detectedLang]
        };

        console.log('[DEBUG] Step 3.1: Create summarizer session');
        await this.summarizer.createSession(options, (progress) => {
          this.ui.updateProgress(progress, 'Downloading summarization model...');
        });
      }
      
      console.log('[DEBUG] Step 4: Summarize streaming');
      this.ui.updateProgress(100, 'Generating summary...');
      console.log('Starting summarization streaming...');
      
      let hasReceivedChunk = false;
      await this.summarizer.summarizeStreaming(text, {}, (chunk) => {
        if (!hasReceivedChunk) {
          this.ui.setLoading(false); // Hide the progress bar once streaming starts
          hasReceivedChunk = true;
        }
        this.currentSummary = chunk;
        this.ui.displaySummary(this.currentSummary);
      });
      
      if (!hasReceivedChunk) {
        throw new Error('AI returned an empty summary. This might happen if the content is too short or blocked.');
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
    if (!this.currentSummary) return;

    this.ui.elements.translateBtn.disabled = true;
    const originalBtnText = this.ui.elements.translateBtn.querySelector('span').textContent;
    this.ui.elements.translateBtn.querySelector('span').textContent = 'Translating...';

    try {
      const targetLanguage = this.sourceLanguage === 'en' ? 'es' : 'en';
      
      const ready = await this.translator.isAvailable('en', targetLanguage);
      if (!ready) throw new Error(`Translation from English to ${targetLanguage} is not supported.`);

      let translatedText = '';
      await this.translator.translateStreaming(this.currentSummary, 'en', targetLanguage, (chunk) => {
        translatedText = chunk;
        this.ui.displaySummary(translatedText);
      });
      
    } catch (error) {
      alert(error.message);
    } finally {
      this.ui.elements.translateBtn.disabled = false;
      this.ui.elements.translateBtn.querySelector('span').textContent = originalBtnText;
    }
  }

  handleCopy() {
    if (this.currentSummary) {
      navigator.clipboard.writeText(this.currentSummary);
      const originalText = this.ui.elements.copyBtn.querySelector('span').textContent;
      this.ui.elements.copyBtn.querySelector('span').textContent = 'Copied!';
      setTimeout(() => {
        this.ui.elements.copyBtn.querySelector('span').textContent = originalText;
      }, 2000);
    }
  }
}

// Initialize the app when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new App();
});
