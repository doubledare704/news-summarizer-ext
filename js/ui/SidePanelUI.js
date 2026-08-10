/**
 * Handles all UI updates for the Side Panel.
 */
export class SidePanelUI {
  constructor() {
    this.elements = {
      appRoot: document.getElementById('app-root'),
      summarizeBtn: document.getElementById('summarize-btn'),
      regenerateBtn: document.getElementById('regenerate-btn'),
      copyBtn: document.getElementById('copy-btn'),
      shareBtn: document.getElementById('share-btn'),
      translateBtn: document.getElementById('translate-btn'),
      btnText: document.getElementById('btn-text'),
      btnIcon: document.getElementById('btn-icon'),
      loadingSpinner: document.getElementById('loading-spinner'),
      emptyState: document.getElementById('empty-state'),
      summaryContainer: document.getElementById('summary-container'),
      summaryTitle: document.getElementById('summary-title'),
      summaryContent: document.getElementById('summary-content'),
      thinkingOverlay: document.getElementById('thinking-overlay'),
      thinkingStatus: document.getElementById('thinking-status'),
      progressContainer: document.getElementById('download-progress-container'),
      progressBar: document.getElementById('download-progress-bar'),
      progressPercentage: document.getElementById('download-percentage'),
      actionBar: document.getElementById('action-bar'),
      
      // Settings Elements
      settingsBtn: document.getElementById('settings-btn'),
      settingsPanel: document.getElementById('settings-panel'),
      closeSettingsBtn: document.getElementById('close-settings-btn'),
      titleLengthSelect: document.getElementById('title-length-select'),
      summaryTypeSelect: document.getElementById('summary-type-select'),
      summaryLengthSelect: document.getElementById('summary-length-select'),
      autoSummarizeToggle: document.getElementById('auto-summarize-toggle'),
      targetLangSelect: document.getElementById('target-lang-select'),
    };
  }

  toggleSettings(show) {
    if (show) {
      this.elements.settingsPanel.classList.remove('hidden');
    } else {
      this.elements.settingsPanel.classList.add('hidden');
    }
  }

  updateProgress(percentage, status = 'Downloading AI model...') {
    this.elements.thinkingStatus.textContent = status;
    
    if (percentage > 0 && percentage < 100) {
      this.elements.progressContainer.classList.remove('hidden');
      this.elements.progressPercentage.classList.remove('hidden');
      this.elements.progressBar.style.width = `${percentage}%`;
      this.elements.progressPercentage.textContent = `${Math.round(percentage)}%`;
    } else if (percentage >= 100) {
      this.elements.thinkingStatus.textContent = 'Initializing AI...';
      this.elements.progressContainer.classList.add('hidden');
      this.elements.progressPercentage.classList.add('hidden');
    }
  }

  resetUI() {
    this.clearContent();
    this.setLoading(false);
    this.elements.emptyState.classList.remove('hidden');
    this.elements.summaryContainer.classList.add('hidden');
    this.elements.actionBar.classList.add('hidden');
  }

  setLoading(isLoading, status = 'Synthesizing...') {
    this.isLoading = isLoading;
    if (isLoading) {
      this.elements.summarizeBtn.disabled = true;
      this.elements.btnText.textContent = 'Summarizing...';
      this.elements.btnIcon.classList.add('hidden');
      this.elements.loadingSpinner.classList.remove('hidden');
      this.elements.thinkingOverlay.classList.remove('hidden');
      this.elements.thinkingStatus.textContent = status;
      this.elements.progressContainer.classList.add('hidden');
      this.elements.progressPercentage.classList.add('hidden');
      this.elements.emptyState.classList.add('hidden');
      this.elements.summaryContainer.classList.remove('hidden');
    } else {
      this.elements.summarizeBtn.disabled = false;
      this.elements.btnText.textContent = 'Summarize Now';
      this.elements.btnIcon.classList.remove('hidden');
      this.elements.loadingSpinner.classList.add('hidden');
      this.elements.thinkingOverlay.classList.add('hidden');
    }
  }

  clearContent() {
    this.elements.summaryTitle.textContent = '';
    this.elements.summaryContent.innerHTML = '';
  }

  displayTitle(text) {
    this.elements.summaryTitle.textContent = text;
    this.elements.thinkingOverlay.classList.add('hidden');
    this.elements.summaryContainer.classList.remove('hidden');
    this.elements.emptyState.classList.add('hidden');
  }

  displaySummary(text) {
    this.elements.thinkingOverlay.classList.add('hidden');

    if (!text) {
      this.elements.summaryContent.innerHTML = '<p class="text-slate-400 italic">No summary generated.</p>';
      return;
    }

    // Format text (simple markdown-like conversion)
    let hasList = false;
    const html = text
      .split('\n')
      .map(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
          hasList = true;
          return `<li class="ml-4 list-disc mb-2">${trimmed.substring(2)}</li>`;
        }
        if (trimmed === '') return '';
        return `<p class="mb-4">${trimmed}</p>`;
      })
      .join('');

    this.elements.summaryContent.innerHTML = hasList && !html.includes('<p>') ? `<ul class="space-y-1">${html}</ul>` : html;
    
    this.elements.summaryContainer.classList.remove('hidden');
    this.elements.actionBar.classList.remove('hidden');
    this.elements.actionBar.classList.add('grid');
    this.elements.emptyState.classList.add('hidden');
  }

  getOptions() {
    return {
      titleLength: this.elements.titleLengthSelect.value,
      summaryType: this.elements.summaryTypeSelect.value,
      summaryLength: this.elements.summaryLengthSelect.value,
      autoSummarize: this.elements.autoSummarizeToggle.checked,
      targetLanguage: this.elements.targetLangSelect.value,
    };
  }

  setOptions(options) {
    if (options.titleLength) this.elements.titleLengthSelect.value = options.titleLength;
    if (options.summaryType) this.elements.summaryTypeSelect.value = options.summaryType;
    if (options.summaryLength) this.elements.summaryLengthSelect.value = options.summaryLength;
    if (options.autoSummarize !== undefined) this.elements.autoSummarizeToggle.checked = options.autoSummarize;
    if (options.targetLanguage) this.elements.targetLangSelect.value = options.targetLanguage;
  }

  showError(message) {
    this.elements.summaryContent.innerHTML = `
      <div class="flex flex-col items-center text-red-500 gap-2 p-4 text-center">
        <svg fill="none" height="32" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="32">
          <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke-linecap="round" stroke-linejoin="round"></path>
        </svg>
        <p class="font-bold">Error</p>
        <p class="text-sm">${message}</p>
      </div>
    `;
    this.elements.summaryContainer.classList.remove('hidden');
  }
}
