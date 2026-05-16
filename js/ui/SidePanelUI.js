/**
 * Handles all UI updates for the Side Panel.
 */
export class SidePanelUI {
  constructor() {
    this.elements = {
      summarizeBtn: document.getElementById('summarize-btn'),
      btnText: document.getElementById('btn-text'),
      btnIcon: document.getElementById('btn-icon'),
      loadingSpinner: document.getElementById('loading-spinner'),
      emptyState: document.getElementById('empty-state'),
      summaryContainer: document.getElementById('summary-container'),
      summaryContent: document.getElementById('summary-content'),
      thinkingOverlay: document.getElementById('thinking-overlay'),
      thinkingStatus: document.getElementById('thinking-status'),
      progressContainer: document.getElementById('download-progress-container'),
      progressBar: document.getElementById('download-progress-bar'),
      progressPercentage: document.getElementById('download-percentage'),
      actionBar: document.getElementById('action-bar'),
      styleSelect: document.getElementById('style-select'),
      lengthSelect: document.getElementById('length-select'),
      copyBtn: document.getElementById('copy-btn'),
      translateBtn: document.getElementById('translate-btn'),
    };
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

  setLoading(isLoading, status = 'Analyzing Page...') {
    this.isLoading = isLoading;
    if (isLoading) {
      this.elements.summarizeBtn.disabled = true;
      this.elements.btnText.textContent = 'Thinking...';
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
      this.elements.btnText.textContent = 'Generate Summary';
      this.elements.btnIcon.classList.remove('hidden');
      this.elements.loadingSpinner.classList.add('hidden');
      this.elements.thinkingOverlay.classList.add('hidden');
    }
  }

  displaySummary(text) {
    // Hide overlay as soon as we have any response from the AI
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

    // Wrap in UL if we detected list items and no other paragraphs
    this.elements.summaryContent.innerHTML = hasList && !html.includes('<p>') ? `<ul class="space-y-1">${html}</ul>` : html;
    
    this.elements.summaryContainer.classList.remove('hidden');
    this.elements.actionBar.classList.remove('hidden');
    this.elements.actionBar.classList.add('grid');
    this.elements.emptyState.classList.add('hidden');
  }

  getOptions() {
    return {
      type: this.elements.styleSelect.value,
      length: this.elements.lengthSelect.value,
    };
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
