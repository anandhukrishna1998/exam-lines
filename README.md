# Exam Lines 🚇

**Exam Lines** is an interactive, transit-map styled certification practice platform designed for modern cloud certifications:
- **Google Cloud Professional Machine Learning Engineer (PMLE)** — 6 lines, 14 stations, 50-question 120-minute timed simulation.
- **AWS Certified Solutions Architect – Associate (SAA-C03)** — 4 lines, 14 stations, 65-question 130-minute timed simulation.

Styled as an interactive subway transit network, learners navigate through knowledge domains as transit lines, mastering sub-objectives as stations along the way.

---

## Quick Start

### Prerequisites
- **Node.js >= 20.0.0**
- Zero `npm install` packages required! The entire project has **zero external npm dependencies**.

### Commands

1. **Build the production bundle**:
   ```bash
   npm run build
   ```
   *Compiles all CSS and JavaScript modules into single-file self-contained distribution bundles in `dist/` (`dist/exam-lines.html` and `dist/index.html`).*

2. **Start the local server**:
   ```bash
   npm start
   ```
   *Launches the built-in, zero-dependency Node HTTP server at **`http://localhost:3000`**.*

3. **Run the automated test suite**:
   ```bash
   npm test
   ```
   *Executes all 110 unit, integration, bank, and build constraint tests via native `node:test`.*

---

## Key Features

- **Interactive Transit Map**: Custom SVG-rendered subway network visualizing line status, station mastery, and animated route lines.
- **4 Specialized Study Modes**:
  - **Practice Mode**: Immediate answer checking, detailed option rationales, and explanations.
  - **Exam Express**: Full timed exam simulation (50 questions in 120 min for PMLE; 65 questions in 130 min for AWS) with route strip navigation, question flagging, and submission review modal.
  - **Line Drill**: Targeted deep-dive practice on a single section or domain.
  - **Retry Missed**: Instant retry mode focusing exclusively on previously missed questions.
- **Verified 300-Question Scenario Bank**:
  - **150 PMLE Questions** across 6 sections satisfying exact exam guide distribution quotas.
  - **150 AWS SAA-C03 Questions** across 4 domains with 5-option multi-choice rules.
  - Strict length symmetry (longest option $\le 3\times$ shortest, correct option longest in $\le 60\%$ of single questions).
  - 100% compliant with 2026 product naming standards (e.g. *Sensitive Data Protection*, *Agent Platform*, *Cloud Run functions*, *Managed Service for Apache Airflow*, *AWS IAM Identity Center*, *Amazon OpenSearch Service*, *Amazon EventBridge*, *Amazon Data Firehose*, *Amazon Managed Service for Apache Flink*).
- **Dual-Stage AI Question Generation & Verification**:
  - Supports Google Gemini (`gemini-2.5-flash`), Anthropic Claude (`claude-3-5-sonnet`), and OpenAI-compatible endpoints (Bring Your Own Key).
  - Streams candidate questions in JSONL format via Server-Sent Events (SSE).
  - Automatically runs an independent blind verification pass (hiding the answer key) before adding questions to the learner's library.
- **Robust Persistence & State Management**:
  - Offline-first `localStorage` storage engine with automatic pruning and state repair.
  - Optional Google Cloud Firestore multi-device synchronization.
  - Performance history analytics, SVG score progression graphs, weakest station diagnosis, and question reporting/restoration.
- **Accessibility & Keyboard Navigation**:
  - Keys `1`–`5` to toggle choices, `N` / `P` (or `J` / `K`) for next/prev question, `F` to flag, `Esc` to close modals.
  - Dark and light theme switcher with smooth CSS variable transitions.
- **Progressive Web App (PWA)**:
  - Offline caching via service worker (`sw.js`), web manifest (`manifest.json`), and custom SVG icon (`icon.svg`).
  - Zero dynamic HTML injection: DOM is constructed purely using declarative `h()` and `svgEl()` helpers (`innerHTML`, `outerHTML =`, `insertAdjacentHTML`, and `document.write` are strictly forbidden).

---

## Project Structure

```
exam-lines/
├── build.mjs                  # Single-file HTML concatenator & asset packager
├── serve.mjs                  # Zero-dependency local static HTTP server
├── package.json               # Pure ES module definition & scripts
├── REBUILD_PROMPT.md          # Complete architectural specification & rules
├── dist/                      # Production distributables
│   ├── exam-lines.html        # Self-contained single-file application (~664 KB)
│   ├── index.html             # Identical copy for web root serving
│   ├── manifest.json          # PWA web manifest
│   ├── sw.js                  # PWA service worker
│   └── icon.svg               # Application icon
├── src/
│   ├── shell.html             # Base HTML shell
│   ├── styles.css             # Transit-inspired typography & CSS variables
│   ├── main.js                # App entrypoint, state coordination & view router
│   ├── runtime.js             # Dual-slot AI generation & background verification
│   ├── js/                    # Core business logic
│   │   ├── sections.js        # PMLE syllabus & sub-objective station definitions
│   │   ├── exams.js           # Exam registry (PMLE & SAA-C03), rules & naming
│   │   ├── util.js            # FNV-1a hashing, PRNG, array shuffling
│   │   ├── validate.js        # Question schema & stale term validation
│   │   ├── select.js          # Apportionment math, question picking, pool merging
│   │   ├── scoring.js         # Answer evaluation, sub-objective breakdowns
│   │   ├── session.js         # Exam/Practice state machines & wall-clock timer
│   │   ├── store.js           # LocalStorage & Firestore persistence backends
│   │   ├── library.js         # Verified AI question library management
│   │   ├── providers.js       # Gemini, Claude, and OpenAI BYOK client adapters
│   │   └── generate.js        # AI prompt generation, JSONL parser, verifier judge
│   ├── bank/                  # 300 hand-checked scenario questions
│   │   ├── section1.js to 6.js# PMLE question bank (150 questions)
│   │   └── aws/               # AWS SAA-C03 question bank (150 questions)
│   │       └── domain1.js to 4.js
│   └── ui/                    # Declarative DOM & SVG rendering
│       ├── dom.js             # h() and svgEl() DOM builders (zero innerHTML)
│       ├── keys.js            # Keyboard shortcut handlers
│       ├── viewmodels.js      # Transit route strip & map layout calculators
│       ├── chrome.js          # Navigation bar, AI chip, store indicator, theme switch
│       ├── map.js             # Interactive SVG transit map
│       ├── home.js            # Masthead, ticket selection, line drill list
│       ├── quiz.js            # Question stem, options, rationales, route strip
│       ├── results.js         # Score report, station mastery, review filters
│       ├── history.js         # SVG score timeline chart & weakest station radar
│       └── overlay.js         # AI settings, question reporting, exit dialogs
└── test/                      # 110 automated tests using node:test
    ├── build.test.js          # Single-file build & DOM API compliance test
    ├── bank.test.js           # 150 PMLE bank validation & allocation test
    ├── aws-bank.test.js       # 150 AWS bank validation & allocation test
    └── ...                    # Comprehensive unit tests for all modules
```

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run build` | Builds the single-file distribution artifacts into `dist/`. |
| `npm start` | Runs the local HTTP server on port 3000 to test `dist/`. |
| `npm test` | Runs the complete native Node.js test suite (110 tests). |

---

## License

Private / Proprietary. Built for the Exam Lines project.
