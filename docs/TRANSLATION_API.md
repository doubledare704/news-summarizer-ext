Here is the complete documentation for the Chrome **Translator API** converted into a structured, developer-focused Markdown file (`translator-api.md`). It is optimized for technical comprehension and ingestion by coding models, with an emphasis on language pack orchestration, lifecycle events, and performance optimization.

---

# Built-In Browser AI: Translator API Technical Specifications

The `Translator` API provides native, client-side neural machine translation within the browser environment. By using local translation models and specialized language packs, applications can run near-zero latency text conversions without exposing user content to remote servers, eliminating network processing costs and satisfying strict data isolation requirements.

## 1. Feature Detection & Environment Support

### Browser Compatibility

* **Chrome:** Supported from version 138+ (Stable).
* **Edge / Firefox / Safari:** Not natively supported.

### Feature Detection

Verify the existence of the `Translator` interface in the current global context (`self`) before loading downstream execution logic:

```javascript
if ('Translator' in self) {
  // Environment supports the built-in Translator API
  console.log("Translator API is available.");
} else {
  console.error("Translator API is not supported in this browser environment.");
}

```

*Tip: For automated compilation environments, integrate `@types/dom-chromium-ai` to expose native TypeScript typings for all Chromium-based built-in AI components.*

---

## 2. Architecture & Language Pack Mechanics

Unlike large foundational models (e.g., Gemini Nano) that require a heavy monolithic download up front, the browser's translation pipeline relies on an orchestrated infrastructure of core engine modules and dynamic **language packs**.

### Core Footprint and Constraints

* **Core Model Size:** Small, optimized translation engine.
* **Language Packs:** Act like on-demand dictionaries matching unique language pairs (e.g., English $\leftrightarrow$ Spanish). These packs are lazily fetched over the network upon request and cached locally.
* **Hardware Profile Requirements:** Shares the standard Chromium built-in AI desktop criteria ($\ge$ 16 GB RAM, $\ge$ 4 CPU Cores, and $\ge$ 22 GB free disk storage to prevent engine cache eviction cascades).

---

## 3. Language Pair Availability Checking

Because local translation depends on the availability of matching language packs, you must check the availability of specific language pairs before initializing a translation session.

The static `Translator.availability()` method takes a configuration object containing `sourceLanguage` and `targetLanguage` values formatted as ISO 639-1 language tags.

```javascript
const availabilityStatus = await self.Translator.availability({
  sourceLanguage: 'en',
  targetLanguage: 'ja'
});

if (availabilityStatus === 'readily') {
  // Language packs are cached and ready for instant conversion
} else if (availabilityStatus === 'downloadable') {
  // System supports this pair but must pull the language pack over the network
} else if (availabilityStatus === 'unavailable') {
  // This specific language pair combination is not supported by the local engine
}

```

---

## 4. Model Lifecycle & Session Allocation

To initialize a translation pipeline, call `Translator.create()`. If a required language pack is missing and the availability status is `downloadable`, calling `create()` automatically initiates a network download.

### Instantiation with Progress Monitoring

Always perform initialization inside a verified user interaction handler (`navigator.userActivation.isActive`) to satisfy browser engagement checks.

```javascript
async function allocateTranslator(source, target) {
  try {
    const translatorSession = await self.Translator.create({
      sourceLanguage: source,
      targetLanguage: target,
      monitor(m) {
        m.addEventListener('downloadprogress', (event) => {
          const ratio = (event.loaded / event.total) * 100;
          console.log(`Downloading Language Pack (${source} -> ${target}): ${ratio.toFixed(2)}%`);
        });
      }
    });
    return translatorSession;
  } catch (error) {
    if (error.name === 'NotSupportedError') {
      console.error("The requested language pair is unsupported by the host engine.");
    } else {
      console.error("Failed to initialize translator instance:", error);
    }
  }
}

```

---

## 5. Implementation Execution Paradigms

Once a `Translator` session is allocated, text can be processed either in a single atomic pass or as an incremental stream.

### Paradigm A: Batch Translation (Atomic Processing)

Best for UI elements, messages, or short-form texts where processing latency is negligible.

```javascript
const translator = await allocateTranslator('en', 'fr');

if (translator) {
  const resultText = await translator.translate("Where is the nearest bus stop, please?");
  console.log("Translated Output:", resultText); 
  // Expected Output: "Où est le prochain arrêt de bus, s'il vous plaît ?"
}

```

### Paradigm B: Streaming Translation (Real-Time Output)

Best for longer text formats or real-time UI updates, minimizing the time-to-first-token (TTFT) by outputting translation segments as they are processed.

```javascript
const translator = await allocateTranslator('es', 'en');
const sourceContainer = "Muchas gracias por tu ayuda en este problema complejo.";

const outputStream = translator.translateStreaming(sourceContainer);
let accumulatedTranslation = "";

for await (const textChunk of outputStream) {
  accumulatedTranslation += textChunk;
  document.getElementById('translation-viewport').innerText = accumulatedTranslation;
}

```

---

## 6. Resource Management & Lifecycles

Local AI models consume significant system memory and compute resources while active. To maintain optimal application performance, always release an instance's underlying resources as soon as its execution pipeline is finished.

```javascript
const shortLivedTranslator = await allocateTranslator('en', 'de');

// Perform operations
const output = await shortLivedTranslator.translate("System initialization sequence complete.");
console.log(output);

// Explicitly free memory allocations
await shortLivedTranslator.destroy();
console.log("Translator instance safely disposed.");

```

---

## 7. Security Architecture & Execution Topologies

### Sandbox Access Management (Permissions Policy)

Access to the local translation engine is limited to top-level document contexts and same-origin executing iframes by default. To allow cross-origin iframes to use the interface, explicitly specify the `allow="translator"` policy attribute in the hosting code:

```html
<!-- Main Host Origin Context (https://main-application.corp) -->
<iframe 
  src="https://trusted-third-party-plugin.network/embed" 
  allow="translator">
</iframe>

```

### Context Restrictions

* **Web Workers:** **Not Supported.** Because verifying cross-origin Permissions Policy rules within separate worker threads introduces significant architectural complexity, `Translator` instances must be managed directly inside the primary window context loop.
* **Transparency Best Practice:** Because local models can produce slight variations in phrasing or context compared to server-side equivalents, notify users in the UI whenever automated client-side translation tools are actively handling their chat interactions or source materials.