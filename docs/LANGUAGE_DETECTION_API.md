Here is the conversion of the Chrome **Language Detector API** documentation into a structured, developer-focused technical specification Markdown file (`language-detection.md`).

It is tailored for coding models and technical comprehension, focusing on hardware profiles, operational paradigms, error mitigation, and security policies.

---

# Built-In Browser AI: Language Detector API Technical Specifications

The `LanguageDetector` API provides an on-device, client-side classification and ranking model optimized to identify the linguistic composition of string inputs. This local engine eliminates server-side round trips, ensures data isolation, and optimizes performance metrics for pre-translation pipelines, dynamic interface localized rendering, or task-specific LLM routing.

## 1. Feature Detection & Environment Support

### Browser Compatibility

* **Chrome:** Supported from version 138+ (Stable).
* **Edge / Firefox / Safari:** Not supported.

### Feature Detection

Execute feature detection on the global `self` execution context before triggering downstream operations:

```javascript
if ('LanguageDetector' in self) {
  // Environment supports the native Language Detector API
  console.log("LanguageDetector is available.");
} else {
  console.error("LanguageDetector API is not supported in this browser environment.");
}

```

*Tip: Add the `@types/dom-chromium-ai` npm dependency to populate complete TypeScript compiler declarations for experimental Chromium-native AI interfaces.*

---

## 2. System Architecture & Resource Profiles

While heavier generative APIs (like Prompt or Summarizer) run exclusively on large-footprint weights, the Language Detection API uses a highly compressed, task-specific classification model. However, it shares the broader system checks of the Chrome built-in AI runtime framework:

| Requirement | Specification / Threshold |
| --- | --- |
| **Target Platforms** | Desktop architectures only (Windows 10/11, macOS 13+, Linux, ChromeOS Platform 16389.0.0+ on Chromebook Plus). *Mobile systems (Android/iOS) are unsupported.* |
| **Profile Storage Constraints** | $\ge$ 22 GB free disk space required on the profile volume to kick off downstream dependencies. If free space drops below 10 GB post-download, the internal profile runtime cache is evicted. |
| **Compute Profiling** | **GPU:** > 4 GB VRAM allocated. <br>

<br>**CPU:** $\ge$ 16 GB RAM AND $\ge$ 4 independent physical CPU cores. |
| **Network Constraint** | Unmetered initial connection required exclusively for fetching the sub-model payload. Zero telemetry or inference payload data is transmitted to remote endpoints during execution. |

---

## 3. Model Lifecycle & Session Allocation

The underlying model is downloaded on-demand when the application first attempts initialization. Because it is highly compact, it may already be pre-cached on systems utilizing native browser localization utilities.

### Step 1: Query Availability

Verify whether the local engine is immediately available, requires a network download step, or is blocked by system constraints.

```javascript
const runtimeAvailability = await self.LanguageDetector.availability();

if (runtimeAvailability === 'readily') {
  console.log("Model is cached locally; instantiation is instantaneous.");
} else if (runtimeAvailability === 'downloadable') {
  console.log("Model requires lazy network download.");
} else if (runtimeAvailability === 'unavailable') {
  throw new Error("Local language classification is not supported on this platform.");
}

```

### Step 2: Instantiate and Track Progress

Construct the active inference session using `LanguageDetector.create()`. **Enforce Execution Guardrails:** Instantiation calls should follow a verified user interaction heuristic (`navigator.userActivation.isActive`) to comply with Chromium execution policies.

```javascript
async function initializeDetectorSession() {
  if (!navigator.userActivation.isActive) {
    console.warn("Session allocation should be wrapped inside a direct user interaction callback.");
  }

  try {
    const detectorSession = await self.LanguageDetector.create({
      monitor(m) {
        m.addEventListener('downloadprogress', (event) => {
          const downloadRatio = (event.loaded / event.total) * 100;
          console.log(`Language Sub-Model Pull Progress: ${downloadRatio.toFixed(2)}%`);
        });
      }
    });
    return detectorSession;
  } catch (creationError) {
    console.error("Failed to allocate LanguageDetector instance:", creationError);
  }
}

```

---

## 4. Execution Mechanics & Output Vectors

The `LanguageDetector` API runs a client-side ranking model that evaluates text and returns a list of candidate languages ordered by mathematical probability.

### The Inference Loop (`.detect()`)

The `.detect(text)` method accepts raw target strings and yields an array of prediction records. Each record consists of an ISO language code and a normalized confidence float ranging from `0.0` (absolute zero match probability) to `1.0` (absolute mathematical certainty).

```javascript
const targetSession = await initializeDetectorSession();
const inputString = "Hallo und herzlich willkommen!";

// Execute local inference classification
const predictionOutputs = await targetSession.detect(inputString);

for (const candidate of predictionOutputs) {
  const { detectedLanguage, confidence } = candidate;
  
  // Enforce a programmatic threshold filter for production classification
  if (confidence > 0.05) {
    console.log(`Language Match: ISO[${detectedLanguage}] -> Confidence: ${(confidence * 100).toFixed(4)}%`);
  }
}

/* Expected Output Log Matrix:
de 0.9993835687637329
en 0.00038279531872831285
nl 0.00010798392031574622
*/

```

---

## 5. Implementation Edge Cases & Guardrails

### Short-String Accuracy Drop (High-Entropy Inputs)

* **Problem:** Passing isolated words, single-word tokens, or extremely short phrases (high-entropy strings) significantly degrades the classification accuracy of the model.
* **Mitigation Strategy:** Implement an input-length guardrail. If an input falls below a safe text threshold, require a higher minimum confidence score before acting on the result, or fall back to an explicit `'unknown'` classification state.

```javascript
function safeDetectLanguage(predictionArray, shortStringGuardLength = 15) {
  if (!predictionArray || predictionArray.length === 0) return 'unknown';
  
  const primaryCandidate = predictionArray[0];
  const stringLength = shortStringGuardLength; 

  // Strict high-entropy thresholding
  if (stringLength < 15 && primaryCandidate.confidence < 0.85) {
    return 'unknown';
  }
  
  return primaryCandidate.confidence > 0.5 ? primaryCandidate.detectedLanguage : 'unknown';
}

```

### Supported Linguistic Space Checks

* **Framework Constraint:** The internal model is trained on a defined, high-coverage subset of primary world languages, but it is not universally comprehensive.
* **Feature Capability:** As of Chrome 132+, applications can run target capabilities queries directly against the interface to verify whether specific target locales are supported by the current client-side runtime model before processing inputs.

---

## 6. Security Architecture & Execution Topologies

### Sandbox Access Management (Permissions Policy)

Access to the underlying language classification engine is restricted to top-level window frames and same-origin executing documents. To authorize cross-origin iframe instances, pass an explicit `allow="language-detector"` permission attribute through the hosting node:

```html
<iframe 
  src="https://sandboxed-third-party-extension.network/pipeline" 
  allow="language-detector">
</iframe>

```

### Threading Restraints

* **Web Workers:** **Not Supported.** Because verifying cross-origin Permissions Policy statuses inside individual concurrent worker document contexts is highly complex, the `LanguageDetector` interface cannot be instantiated within Web Worker or Service Worker contexts. All interactions must be routed directly through the primary window execution scope.