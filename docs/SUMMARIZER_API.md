Here is the complete documentation for the Chrome **Summarizer API** converted into a highly structured, developer-focused Markdown file (`summarizer-api.md`). It is optimized for coding models and technical comprehension, emphasizing architecture, parameters, lifecycle management, and code execution.

---

# Built-In Browser AI: Summarizer API Technical Specifications

The `Summarizer` API allows web applications to run on-device language models (specifically Gemini Nano in Chrome) to distill lengthy text, chat logs, or articles into structured summaries without transmitting data to external servers.

## 1. Feature Detection & Environment Support

### Browser Compatibility

* **Chrome:** Supported from version 138+ (Stable).
* **Edge:** Supported behind experimental flags.
* **Firefox / Safari:** Not supported.

### Feature Detection

Always verify API availability within the global `self` context before invocation:

```javascript
if ('Summarizer' in self) {
  // The Summarizer API is supported by the browser engine
  console.log("Summarizer API is available.");
} else {
  console.error("Summarizer API is not supported in this environment.");
}

```

*Tip: For type safety, install `@types/dom-chromium-ai` to populate TypeScript definitions for built-in Chromium AI APIs.*

---

## 2. Infrastructure & System Requirements

Because the model runs entirely client-side, the host environment must meet specific hardware constraints:

| Requirement | Specification / Threshold |
| --- | --- |
| **Operating Systems** | Windows 10/11, macOS 13+ (Ventura+), Linux, ChromeOS (Platform 16389.0.0+ on Chromebook Plus). *Mobile OS not supported.* |
| **Storage Space** | $\ge$ 22 GB free disk space on the volume housing the Chrome profile. *(Note: If space drops below 10 GB after download, the model is cleared automatically).* |
| **Memory / CPU** | $\ge$ 16 GB RAM AND $\ge$ 4 CPU Cores. |
| **GPU Requirements** | Dedicated VRAM > 4 GB. |
| **Network (Initial)** | Unmetered connection (Wi-Fi/Ethernet) required **only** for the initial model payload download. Subsequent inferences require 0% network overhead. |

---

## 3. Model Lifecycle & Download Management

The underlying model (Gemini Nano) is asynchronously pulled down on-demand upon the first instantiation request.

### Step 1: Query Availability Status

Check if the model is ready, requires a download, or is incompatible with the client system.

```javascript
const availability = await Summarizer.availability();

if (availability === 'readily') {
  // Model is local and ready to instantiate instantly
} else if (availability === 'downloadable') {
  // Model needs to be downloaded over the network
} else if (availability === 'unavailable') {
  // Hardware or configuration does not support on-device AI
}

```

### Step 2: Instantiate and Monitor Model Download

To initiate downloading and construct an execution session, use `Summarizer.create()`. **Note:** This must be triggered after checking for explicit user activation (e.g., inside a click handler) to comply with browser interaction heuristics.

```javascript
if (navigator.userActivation.isActive) {
  try {
    const summarizer = await Summarizer.create({
      monitor(m) {
        m.addEventListener('downloadprogress', (e) => {
          const percentage = (e.loaded / e.total) * 100;
          console.log(`Model Download Progress: ${percentage.toFixed(2)}%`);
        });
      }
    });
    // Model session ready for inference
  } catch (error) {
    console.error("Failed to initialize summarizer:", error);
  }
}

```

---

## 4. API Configuration & Parameter Matrices

The `Summarizer.create(options)` factory method accepts a configuration object to fine-tune constraints. **Parameters are immutable after session creation.**

```typescript
interface SummarizerOptions {
  sharedContext?: string;
  type?: 'key-points' | 'tldr' | 'teaser' | 'headline';
  format?: 'markdown' | 'plain-text';
  length?: 'short' | 'medium' | 'long';
  preference?: 'auto' | 'speed' | 'capability';
  expectedInputLanguages?: string[];
  outputLanguage?: string;
  expectedContextLanguages?: string[];
}

```

### Format Configurations (`format`)

* `markdown` (Default): Outputs structured, semantic Markdown headers and lists.
* `plain-text`: Outputs clean, unformatted continuous strings.

### Strategy Heuristics (`preference`)

* `auto`: Dynamically balances execution speed and nuanced output based on environment stress.
* `speed`: Forces low-latency processing, optimizing execution speeds over highly refined syntax extraction.
* `capability`: Prioritizes rich synthesis and multi-variable handling over compute times.

### Length & Type Correlation Matrix

| Type | Intended Behavior | Length Option | Maximum Token/Formatting Boundaries |
| --- | --- | --- | --- |
| **`tldr`** | Quick, straightforward overview for extreme efficiency. | `short`<br>

<br>`medium`<br>

<br>`long` | 1 Sentence<br>

<br>3 Sentences<br>

<br>5 Sentences |
| **`teaser`** | Highly engaging synthesis, optimized to hook reader interest. | `short`<br>

<br>`medium`<br>

<br>`long` | 1 Sentence<br>

<br>3 Sentences<br>

<br>5 Sentences |
| **`key-points`** | Structured key takeaways parsed out into list formatting. | `short`<br>

<br>`medium`<br>

<br>`long` | 3 Bullet Points<br>

<br>5 Bullet Points<br>

<br>7 Bullet Points |
| **`headline`** | Single continuous phrase acting as a programmatic title. | `short`<br>

<br>`medium`<br>

<br>`long` | ~12 Words<br>

<br>~17 Words<br>

<br>~22 Words |

---

## 5. Implementation Execution Paradigms

You can stream your responses or process inputs synchronously via atomic batching.

### Multi-Language Session Initialization

Define localized expectations upfront so the engine can fail early if a linguistic path is unsupported.

```javascript
const configurator = {
  type: 'key-points',
  format: 'markdown',
  length: 'medium',
  expectedInputLanguages: ['en', 'ja', 'es'],
  outputLanguage: 'es',
  expectedContextLanguages: ['en'],
  sharedContext: 'Target audience reads Spanish tech blogs.'
};

const summarizer = await Summarizer.create(configurator);

```

### Paradigm A: Batch Processing (Atomic Execution)

Use `.summarize()` for structured single-pass outputs. It is highly recommended to strip HTML noise using standard `element.innerText` transformations before feeding text blocks.

```javascript
const rawSourceText = document.querySelector('article').innerText;

const summaryResult = await summarizer.summarize(rawSourceText, {
  context: 'The user demands a summary tailored to a senior developer audience.'
});

console.log("Synthesized Output:\n", summaryResult);

```

### Paradigm B: Real-Time Stream Engine

For progressive text output and minimal time-to-first-token (TTFT) metrics, evaluate `.summarizeStreaming()`.

```javascript
const rawSourceText = document.querySelector('article').innerText;

const dynamicStream = summarizer.summarizeStreaming(rawSourceText, {
  context: 'Tailored for an interactive dashboard display.'
});

for await (const textualChunk of dynamicStream) {
  // Yields incremental structural strings as they evaluate client-side
  document.getElementById('summary-viewport').innerText = textualChunk;
}

```

---

## 6. Security Framework & Sandbox Boundaries

### Cross-Origin Isolation (Permissions Policy)

By default, access to `Summarizer` is restricted exclusively to **Top-Level Windows** and **Same-Origin Iframes**. To pass capability down to third-party nested elements, declare an explicit `allow="summarizer"` directive:

```html
<iframe 
  src="https://external-sandboxed-origin.com/widget" 
  allow="summarizer">
</iframe>

```

### Current Runtime Context Restrictions

* **Web Workers:** Currently **Not Supported**. The browser cannot validate structural cross-origin Permissions Policy rules down into individual concurrent execution threads safely yet. Keep your execution threads bound directly to the Window lifecycle interface.