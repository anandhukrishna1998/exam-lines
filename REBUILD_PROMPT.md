# Rebuild prompt: "Exam Lines" (certification practice app styled as a transit map)

> Paste everything below this line into the AI coding assistant on the new machine. Work through it phase by phase. Do not skip the tests.

---

## 0. Your role and the ground rules

You are rebuilding a finished project from a specification. There is no source code to copy. Everything you need is in this document. Build it exactly as specified: same file layout, module names, function names, constants, strings, storage keys and behaviour. Where this document gives exact text (UI copy, LLM prompts, error notes), use it word for word.

Hard constraints:
- **Plain JavaScript (ES modules), no frameworks, no npm dependencies at all.** No React, no bundler, no TypeScript, no test library. Use Node ≥ 20 built-ins only: `node:test`, `node:assert/strict`, `node:fs`, `node:url`, `node:vm`.
- `package.json` is exactly:
  ```json
  {
    "name": "exam-lines",
    "private": true,
    "type": "module",
    "engines": { "node": ">=20" },
    "scripts": {
      "test": "node --test",
      "build": "node build.mjs"
    }
  }
  ```
- The build inlines every module into **one self-contained HTML file** (no `<html>`, `<head>`, `<body>` or doctype tags; just `<title>`, font links, `<style>`, a root div and one `<script>`).
- **Never use `innerHTML`, `outerHTML =`, `insertAdjacentHTML`, `document.write`, `alert`, `confirm` or `prompt`.** All DOM is built with a tiny `h()` helper that turns every string into a text node. A test enforces this.
- No top-level name may be declared in two modules (all modules are concatenated into one scope; a test compiles the result with `node:vm`).
- Write code in a compact, functional style: small pure functions, `const` arrow callbacks, early returns, short comments only where the "why" is not obvious.
- Each viewer's data lives in `localStorage` (or an optional remote DB, see §8). Every storage access is wrapped in `try/catch`, because storage may be disabled.

Work in phases (§14). After each phase, run `npm test` and make it pass before moving on.

---

## 1. What the app is

**Exam Lines** is a single-page practice app for two cloud certifications:
- **Google Cloud Professional Machine Learning Engineer (PMLE)**: 6 sections, 50-question timed exam, 120 minutes.
- **AWS Certified Solutions Architect – Associate (SAA-C03)**: 4 domains, 65-question timed exam, 130 minutes.

The visual metaphor is a **metro/transit system map**:
- Each exam is a **network**. A switch in the header toggles between them.
- Each exam section/domain is a coloured **line** (line 1 red, line 2 blue, line 3 green, line 4 orange, line 5 purple, line 6 teal).
- Each sub-objective is a **station** on its line. All lines run into a **terminus** labelled with the exam code and "Exam day".
- Sessions are **journeys**, modes are **tickets**, questions are **stops**, and results are a **journey report**.

Features:
1. **Three tickets (modes)** plus a retry mode:
   - *Practice*: 10/20/30 questions across all sections, weighted. The answer and the reasoning for every option appear as soon as you choose.
   - *Exam express* (exam simulation): full length, timed, weighted like the real exam. No feedback until you submit. You can flag questions and jump between them.
   - *Line drill*: one section only, 5/10/15 questions, instant feedback. You can also start one by clicking a line on the map.
   - *Retry wrong answers*: from the results page.
2. **Question pool** = a hand-checked built-in **bank** (150 PMLE + 150 AWS questions) + a per-viewer **library** of saved AI-written questions + **fresh AI-generated questions** for this visit.
3. **AI generation with independent verification.** An LLM writes questions as streamed JSON Lines. Each one is validated, then a *second* LLM call answers every question with the key hidden. Only questions where the verifier gives exactly the keyed answer, says it is confident and raises no factual issue join the pool and the saved library.
4. **AI writers:** (a) the built-in `window.claude` runtime when the page is hosted as a claude.ai artifact, or (b) **bring your own key** in an "AI Settings" dialog: Google Gemini, Anthropic Claude, or any OpenAI-compatible endpoint (OpenAI, OpenRouter and so on). The key is stored only in that browser.
5. **Freshness-aware selection:** unseen questions first, AI-written before bank, then the questions seen longest ago. Options are shuffled every time.
6. **Results:** score, the session drawn on the system map (stations filled by accuracy), score bars by section, the weakest three sub-objectives with the missed topics, and a review of every question with a filter (All / Missed / Flagged).
7. **History:** an SVG line chart of scores over time, the weakest lines over the last 10 journeys, a reported-questions list with Restore, "Forget seen questions", and a recent-journeys table.
8. **Report a question** (4 reasons). Reported questions are skipped in every future session.
9. **Keyboard:** `1`–`5` choose, `N`/`→` next, `P`/`←` previous, `F` flag, `Esc` closes a dialog.
10. **Light/dark theme switch** (follows the system until the viewer picks one), **PWA** (manifest + service worker) for the self-hosted copy, and **GitHub Pages deploy** through GitHub Actions.

---

## 2. Repository layout (create exactly this)

```
.env.example
.gitignore
.github/workflows/deploy.yml
build.mjs
package.json
docs/question-authoring.md
src/shell.html
src/styles.css
src/manifest.json
src/sw.js
src/icon.svg
src/main.js
src/runtime.js
src/js/sections.js      PMLE sections + sub-objectives + GUIDE_DATE
src/js/exams.js         exam registry (PMLE, SAA), naming rules, stale-term regexes
src/js/util.js          shuffle, hashString, normalizeStem, stableStringify
src/js/validate.js      validateQuestion, findStaleTerms, DIFFICULTIES
src/js/select.js        allocateBySection, shuffleOptions, correctIndices, mergePool, pickQuestions
src/js/scoring.js       isCorrect, scoreItems, weakestSubs, aggregateHistory
src/js/session.js       session state machine
src/js/store.js         persisted viewer state, backends, persister
src/js/generate.js      generation prompt, JSONL parser, coercion, verification
src/js/library.js       saved verified-question library (local + db stores)
src/js/providers.js     bring-your-own-key HTTP clients (Gemini / Anthropic / OpenAI-compatible)
src/bank/section1.js … section6.js   PMLE bank arrays BANK_S1..BANK_S6
src/bank/index.js                    BANK
src/bank/aws/domain1.js … domain4.js AWS bank arrays AWS_D1..AWS_D4
src/bank/aws/index.js                AWS_BANK
src/ui/dom.js           h, svgEl, mount, fmtClock, LETTERS
src/ui/keys.js          keyAction
src/ui/viewmodels.js    navigatorCells, sectionBars, lineChartPoints, subLabel, runtimeRefresh, mapLayout, masteryBySub
src/ui/chrome.js        header, chips, theme switch, disclaimer, barList, MODE_NAMES
src/ui/overlay.js       dialogs
src/ui/map.js           systemMap, mapLegend
src/ui/home.js          renderHome, sourcePanel
src/ui/quiz.js          renderQuiz
src/ui/results.js       renderResults
src/ui/history.js       renderHistory
test/…                  (see §13)
```

---

## 3. Build system (`build.mjs`)

Export three things:

```js
export const MODULE_ORDER = [
  'src/js/sections.js', 'src/js/exams.js', 'src/js/util.js', 'src/js/validate.js', 'src/js/select.js',
  'src/js/scoring.js', 'src/js/session.js', 'src/js/store.js', 'src/js/generate.js', 'src/js/library.js',
  'src/js/providers.js',
  'src/bank/section1.js', 'src/bank/section2.js', 'src/bank/section3.js', 'src/bank/section4.js',
  'src/bank/section5.js', 'src/bank/section6.js', 'src/bank/index.js',
  'src/bank/aws/domain1.js', 'src/bank/aws/domain2.js', 'src/bank/aws/domain3.js', 'src/bank/aws/domain4.js',
  'src/bank/aws/index.js',
  'src/ui/dom.js', 'src/ui/keys.js', 'src/ui/viewmodels.js', 'src/ui/chrome.js', 'src/ui/overlay.js',
  'src/ui/map.js', 'src/ui/home.js', 'src/ui/quiz.js', 'src/ui/results.js', 'src/ui/history.js',
  'src/runtime.js', 'src/main.js',
];
```

- `stripModuleSyntax(src)` removes whole-line `import … ;` statements (including multi-line ones, using the regex `/^import\s+[^;]+;[ \t]*\r?\n?/gm`) and strips a leading `export ` only before `const|let|function|async function|class` (`/^export\s+(?=(?:const|let|function|async\s+function|class)\b)/gm`). Strings that contain "export const" mid-line must survive.
- `buildHtml(root='.')` reads `src/shell.html`, replaces `/*__STYLES__*/` with `src/styles.css`, and replaces `/*__SCRIPT__*/` with `(() => {\n'use strict';\n<modules>\n})();`. Each module is prefixed with a comment `// ---- <path>`. Use **function replacers** (`.replace(x, () => css)`) so `$` in the content is not interpreted.
- When run directly (`import.meta.url === pathToFileURL(process.argv[1]).href`), create `dist/`, write the same HTML to `dist/exam-lines.html` (the claude.ai artifact) and `dist/index.html` (the self-hosted copy), copy `manifest.json`, `sw.js` and `icon.svg` from `src/` into `dist/`, and print the size in KB.

`src/shell.html` (exactly):
```html
<title>Exam Lines</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Overpass:wght@400;600;800&display=swap">
<style>/*__STYLES__*/</style>
<div id="app" class="app"><p class="boot">Loading the network map…</p></div>
<script>/*__SCRIPT__*/</script>
```

Because files are concatenated in this order, a module may only *use at load time* names declared by earlier modules. Functions may reference later names at call time.

---

## 4. Exam data (enter this verbatim)

### 4.1 `src/js/sections.js` (PMLE)

```js
export const GUIDE_DATE = 'June 1, 2026';
export const SECTIONS = [
  { id: 1, short: 'Low-code AI', title: 'Architecting low-code AI solutions', weight: 13 },
  { id: 2, short: 'Data and models', title: 'Collaborating within and across teams to manage data and models', weight: 16 },
  { id: 3, short: 'Scaling prototypes', title: 'Scaling prototypes into ML models', weight: 21 },
  { id: 4, short: 'Serving and scaling', title: 'Serving and scaling models', weight: 20 },
  { id: 5, short: 'ML pipelines', title: 'Automating and orchestrating ML pipelines', weight: 18 },
  { id: 6, short: 'Monitoring AI', title: 'Monitoring AI solutions', weight: 13 },
];
```
(The weights sum to 101. That is intentional.)

`SUBOBJECTIVES` is an object keyed by code, each value `{ section, short, title, topics: [...] }`:

| code | short | title | topics |
|---|---|---|---|
| 1.1 | Low-code models | Developing ML models with BigQuery ML or Agent Platform AutoML | Choosing BigQuery ML or Agent Platform AutoML model types (classification, regression, forecasting, clustering) for the business problem; Feature engineering and feature selection in BigQuery ML; Generating predictions with BigQuery ML; Training models with Agent Platform AutoML; Fine-tuning Gemini models from BigQuery |
| 1.2 | AI APIs and models | Building AI solutions with Google Cloud AI APIs or foundation models | Selecting the right model for a task from Model Garden; Industry APIs such as Document AI, Vision API and Translation API; Building and tuning solutions with Gemini, Imagen, Veo and models as a service in Model Garden; Optimizing Gemini applications for cost, latency and availability |
| 2.1 | Data prep | Exploring and preprocessing data for ML | Organizing tabular, text and image data for experimentation, training and serving; Choosing BigQuery SQL, Dataflow, Apache Spark or in-memory Python by scale and complexity; Creating and consolidating features in Agent Platform Feature Store; Protecting privacy and handling PII |
| 2.2 | Notebooks | Prototyping models in notebooks | Collaboration and security practices for Agent Platform Workbench and Colab Enterprise; Developing with PyTorch, scikit-learn and JAX in notebooks; Prototyping with foundation and open models from Model Garden |
| 2.3 | Experiments | Tracking and running ML experiments | Choosing Experiments on Agent Platform, Agent Platform Pipelines or Kubeflow Pipelines for experimentation; Evaluating predictive and gen AI solutions, including LLM-as-a-judge; Tracking artifacts, versions and lineage with Experiments and Agent Platform ML Metadata |
| 3.1 | Model choice | Building models under cost, complexity, latency and scale constraints | Choosing the model type (for example ARIMA, DNN or LLM); Choosing the product (Agent Platform AutoML, BigQuery ML or Agent Platform Pipelines); Choosing the deployment strategy; Modeling techniques for interpretability requirements |
| 3.2 | Training | Training models | Organizing training data in Cloud Storage and BigQuery; Ingesting structured and unstructured data into training pipelines; Training with Agent Platform custom training, Kubeflow on GKE, Agent Platform AutoML and Tabular Workflows; Troubleshooting training failures; Hyperparameter tuning; Fine-tuning foundation models from Model Garden and deciding when tuning is warranted |
| 3.3 | Training hardware | Choosing hardware for training | Comparing CPU, GPU and TPU options; Distributed training with data and model parallelism on GPUs and TPUs |
| 4.1 | Serving | Serving models | Batch and online inference on Agent Platform, Model Garden, Cloud Run and GKE; Prebuilt and custom serving containers for PyTorch, XGBoost and other frameworks; Organizing and versioning models in Agent Platform Model Registry; Rollout strategies such as A/B testing and canary deployments; Inference preprocessing and postprocessing |
| 4.2 | Scaling serving | Scaling online model serving | Serving features with Agent Platform Feature Store; Public and private endpoints; Choosing CPU, GPU, TPU or edge hardware for serving; Scaling the serving backend with Agent Platform Inference and containerized serving; Tuning models for production training and serving |
| 5.1 | Pipelines | Developing end-to-end ML pipelines | Validating data and models; Orchestrating with Agent Platform Pipelines, Managed Service for Apache Airflow or Ray on Gemini Enterprise Agent Platform; Keeping preprocessing consistent between training and serving |
| 5.2 | Retraining | Automating model retraining | Choosing a retraining policy; CI/CD/CT deployment with Cloud Build |
| 6.1 | AI risks | Identifying risks to AI solutions | Preventing data exfiltration, malicious prompting and sensitive-data leaks with regex, safety filters and Model Armor; Responsible AI practices such as bias monitoring; Model explainability with Agent Platform Inference |
| 6.2 | Monitoring | Monitoring, testing and troubleshooting AI solutions | Model Monitoring on Agent Platform and continuous evaluation metrics; Training-serving skew, data drift, concept drift and feature attribution drift; Monitoring, testing and evaluating gen AI solutions |

### 4.2 `src/js/exams.js`

Import `SECTIONS, SUBOBJECTIVES, GUIDE_DATE`. Define the exam objects below and export `PMLE`, `SAA`, `EXAMS = { pmle: PMLE, saa: SAA }`, `examById(id)` (falls back to PMLE), and `examOfQuestionId(id)`, which returns `'saa'` when `/^a\d|^g-saa-/` matches and `'pmle'` otherwise.

**PMLE**:
```js
{ id: 'pmle', code: 'PMLE', vendor: 'Google Cloud', name: 'Google Cloud Professional Machine Learning Engineer',
  shortName: 'ML Engineer', guide: `exam guide of ${GUIDE_DATE}`, sectionWord: 'Section',
  examQuestions: 50, examSeconds: 120 * 60, multiOptions: 4, genBatches: [[1, 2, 3], [4, 5, 6]],
  sections: SECTIONS, subobjectives: SUBOBJECTIVES, namingRules: PMLE_NAMING, staleTerms: PMLE_STALE }
```

`PMLE_NAMING` (array of strings, used in the generation prompt):
1. `Gemini Enterprise Agent Platform (short form "Agent Platform"), never "Vertex AI"`
2. `Agent Platform AutoML, Agent Platform Pipelines, Agent Platform custom training, Agent Platform Workbench, Colab Enterprise`
3. `Agent Platform Feature Store, Agent Platform Model Registry, Model Monitoring on Agent Platform, Experiments on Agent Platform, Agent Platform ML Metadata`
4. `Agent Platform Inference for online inference, batch inference, endpoints and explanations`
5. `Model Garden, RAG Engine, Agent Platform Vector Search, Ray on Gemini Enterprise Agent Platform`
6. `Managed Service for Apache Airflow (never "Cloud Composer"); Managed Service for Apache Spark (never "Dataproc")`
7. `Sensitive Data Protection (never "Cloud DLP"); Cloud Run functions (never "Cloud Functions"); LiteRT for on-device models`
8. `Unchanged names: BigQuery, BigQuery ML, Dataflow, Cloud Storage, Pub/Sub, Cloud Build, Artifact Registry, Cloud Run, GKE, Document AI, Vision API, Translation API, Model Armor, VPC Service Controls, Private Service Connect, Gemini, Imagen, Veo, Gemma`
9. `For features without a product name, say "Agent Platform hyperparameter tuning job" or "the Agent Platform evaluation service"; never invent product names`
10. `Built-in Agent Platform explanations (Sampled Shapley, integrated gradients, XRAI, feature attribution monitoring) were deprecated on March 16, 2026 and shut down on March 16, 2027; if a correct answer uses them, the explanation must say so. Prefer BigQuery ML ML.EXPLAIN_PREDICT or open-source SHAP or LIME`
11. `Agent Platform Feature Store uses feature groups over BigQuery, offline serving for point-in-time training data and online stores for serving; never use the legacy terms "batch serving" or "read-instance list"`

`PMLE_STALE` (array of `{ re, use }`):
```js
{ re: /\bVertex AI\b/i, use: 'Gemini Enterprise Agent Platform (Agent Platform)' },
{ re: /\bCloud Composer\b/i, use: 'Managed Service for Apache Airflow' },
{ re: /(?<!formerly )\bDataproc\b/i, use: 'Managed Service for Apache Spark' },
{ re: /\bCloud DLP\b/i, use: 'Sensitive Data Protection' },
{ re: /\bAI Platform\b/, use: 'Agent Platform' },
{ re: /\bCloud Functions\b/, use: 'Cloud Run functions' },
{ re: /\bExplainable AI\b/i, use: 'Agent Platform Inference explanations' },
```

**SAA**:
```js
{ id: 'saa', code: 'SAA-C03', vendor: 'AWS', name: 'AWS Certified Solutions Architect – Associate',
  shortName: 'Solutions Architect', guide: 'SAA-C03 exam guide', sectionWord: 'Domain',
  examQuestions: 65, examSeconds: 130 * 60, multiOptions: 5, genBatches: [[1, 2], [3, 4]],
  sections: SAA_SECTIONS, subobjectives: SAA_SUBS, namingRules: SAA_NAMING, staleTerms: SAA_STALE }
```
(The name uses an en dash: "Architect – Associate".)

`SAA_SECTIONS`:
```js
{ id: 1, short: 'Secure', title: 'Design Secure Architectures', weight: 30 },
{ id: 2, short: 'Resilient', title: 'Design Resilient Architectures', weight: 26 },
{ id: 3, short: 'High-performing', title: 'Design High-Performing Architectures', weight: 24 },
{ id: 4, short: 'Cost-optimized', title: 'Design Cost-Optimized Architectures', weight: 20 },
```

`SAA_SUBS`:

| code | short | title | topics |
|---|---|---|---|
| 1.1 | Access | Design secure access to AWS resources | IAM users, groups, roles and least-privilege policies; MFA and root user protection; AWS IAM Identity Center and federation; Cross-account access with roles; AWS Organizations and service control policies; Resource-based policies |
| 1.2 | Workloads | Design secure workloads and applications | Security groups and network ACLs; Public and private subnets, NAT gateways and VPC endpoints; AWS WAF, AWS Shield and Amazon GuardDuty; AWS Secrets Manager and Parameter Store; Amazon Cognito for application users |
| 1.3 | Data security | Determine appropriate data security controls | Encryption at rest with AWS KMS; Encryption in transit with TLS and AWS Certificate Manager; S3 bucket policies, Block Public Access and Object Lock; Key rotation and key policies; Amazon Macie for sensitive data discovery; Backups and data retention |
| 2.1 | Loose coupling | Design scalable and loosely coupled architectures | Amazon SQS, Amazon SNS and Amazon EventBridge; AWS Step Functions and AWS Lambda; Amazon API Gateway; EC2 Auto Scaling and Elastic Load Balancing; Containers on Amazon ECS, Amazon EKS and AWS Fargate; Caching and stateless design |
| 2.2 | High availability | Design highly available and/or fault-tolerant architectures | Multi-AZ and multi-Region design; Amazon Route 53 routing policies and health checks; Amazon RDS Multi-AZ and Aurora replicas; Disaster recovery strategies and RTO/RPO; AWS Backup and cross-Region replication |
| 3.1 | Storage | Determine high-performing and/or scalable storage solutions | Amazon S3 performance (multipart upload, Transfer Acceleration); Amazon EBS volume types; Amazon EFS and Amazon FSx; Instance store |
| 3.2 | Compute | Design high-performing and elastic compute solutions | EC2 instance families and placement groups; Auto Scaling policies; AWS Lambda concurrency and memory; AWS Batch and containers |
| 3.3 | Databases | Determine high-performing database solutions | RDS and Aurora read replicas; Amazon RDS Proxy; Amazon DynamoDB capacity, indexes and DAX; Amazon ElastiCache; Aurora Serverless v2 |
| 3.4 | Networking | Determine high-performing and/or scalable network architectures | Amazon CloudFront and AWS Global Accelerator; Load balancer types; AWS Transit Gateway and VPC peering; AWS Direct Connect and Site-to-Site VPN; AWS PrivateLink |
| 3.5 | Ingestion | Determine high-performing data ingestion and transformation solutions | Amazon Kinesis Data Streams and Amazon Data Firehose; AWS Glue, Amazon Athena and Amazon EMR; AWS Lake Formation; AWS DataSync, AWS Transfer Family and offline transfer (AWS Snowball Edge for existing customers, AWS Data Transfer Terminal); Amazon Managed Service for Apache Flink |
| 4.1 | Storage cost | Design cost-optimized storage solutions | S3 storage classes and S3 Intelligent-Tiering; S3 Lifecycle policies; EBS gp3 versus gp2 and snapshot management; S3 Glacier storage classes |
| 4.2 | Compute cost | Design cost-optimized compute solutions | Savings Plans and Reserved Instances; Spot Instances; Rightsizing with AWS Compute Optimizer; AWS Graviton instances; Lambda versus EC2 cost trade-offs |
| 4.3 | Database cost | Design cost-optimized database solutions | Aurora Serverless v2 and reserved DB instances; DynamoDB on-demand versus provisioned capacity; Caching instead of scaling the database; Backup retention costs |
| 4.4 | Network cost | Design cost-optimized network architectures | Data transfer pricing between AZs and Regions; NAT gateway costs and VPC gateway endpoints; Amazon CloudFront to reduce data transfer out; AWS Direct Connect versus VPN costs |

`SAA_NAMING`:
1. `Use full current service names on first mention, e.g. Amazon S3, AWS Lambda, Amazon DynamoDB`
2. `AWS IAM Identity Center (never "AWS SSO" or "AWS Single Sign-On")`
3. `Amazon OpenSearch Service (never "Amazon Elasticsearch Service")`
4. `Amazon EventBridge (never "CloudWatch Events")`
5. `Amazon Data Firehose (never "Kinesis Data Firehose"); Amazon Managed Service for Apache Flink (never "Kinesis Data Analytics")`
6. `Do not mention AWS Snowmobile, which is retired`
7. `Stay within services that are in scope for the SAA-C03 exam`
8. `Current limits: Amazon EBS gp3 scales to 80,000 IOPS and 2,000 MiB/s (use io2 Block Express when sub-millisecond latency is required); AWS Snowball Edge is available only to existing customers since November 2025`

`SAA_STALE`:
```js
{ re: /\bAWS (?:SSO|Single Sign-On)\b/, use: 'AWS IAM Identity Center' },
{ re: /\bElasticsearch Service\b/i, use: 'Amazon OpenSearch Service' },
{ re: /\bCloudWatch Events\b/i, use: 'Amazon EventBridge' },
{ re: /\bKinesis Data Firehose\b/i, use: 'Amazon Data Firehose' },
{ re: /\bKinesis Data Analytics\b/i, use: 'Amazon Managed Service for Apache Flink' },
{ re: /\bSnowmobile\b/i, use: 'AWS Snowball (Snowmobile is retired)' },
```

---

## 5. Core logic modules

### 5.1 `util.js`
- `shuffle(arr, rand = Math.random)`: Fisher–Yates on a copy. Never mutate the input.
- `hashString(s)`: FNV-1a 32-bit (start at `0x811c9dc5`, XOR each `charCodeAt`, `Math.imul(h, 0x01000193)`), returned as `(h >>> 0).toString(36)`.
- `normalizeStem(s)`: `String(s).toLowerCase().replace(/\s+/g, ' ').trim()`.
- `stableStringify(v)`: JSON with object keys sorted recursively; arrays keep their order.

### 5.2 `validate.js`
- `DIFFICULTIES = ['easy', 'medium', 'hard']`.
- `findStaleTerms(text, exam = PMLE)` returns `` `${re.source} → ${use}` `` for each matching stale term.
- `validateQuestion(q, exam = PMLE)` returns `{ ok, errors[] }`. Rules:
  - not a plain object → `['not an object']`
  - `id` non-empty string
  - `sub` exists in `exam.subobjectives`; `section` is an integer in the exam's section ids; the sub belongs to that section
  - `difficulty` ∈ DIFFICULTIES; `type` ∈ {`single`, `multi`}
  - `topic` ≥ 3 chars (trimmed); `stem` ≥ 60 chars and contains `?`; `explanation` ≥ 40 chars
  - option count = `exam.multiOptions` for multi, 4 for single. Each option is an object with non-empty `text`, boolean `correct` and `why` ≥ 15 chars
  - exactly 1 correct (single) or 2 correct (multi): `answer key invalid: N correct options, expected M`
  - no duplicate option texts (after `normalizeStem`)
  - a multi stem must match `/choose two/i`
  - none of stem/explanation/topic/option text/why may contain a stale term → `'stale product naming: …'`

### 5.3 `select.js`
- `allocateBySection(total, sections = SECTIONS)`: largest-remainder apportionment by weight. Floor every exact share, then give the leftover to the largest remainders (ties go to the lower id). Checks: `allocateBySection(50)` → `{1:7,2:8,3:10,4:10,5:9,6:6}`; `(24)` → `{1:3,2:4,3:5,4:5,5:4,6:3}`; `(10)` → `{1:1,2:2,3:2,4:2,5:2,6:1}`; SAA `(65)` → `{1:19,2:17,3:16,4:13}`. The values always sum to `total`.
- `shuffleOptions(q, rand)` → `{ ...q, options: shuffle(q.options, rand) }`.
- `correctIndices(q)` → the indices of correct options.
- `mergePool(bank, generated)`: concatenate bank first, then dedupe by id **and** by normalized stem.
- `pickQuestions(pool, { count, section = null, seen = {}, reported = {}, rand, sections = SECTIONS })`:
  - drop reported questions, and keep only `section` if one is given
  - rank by freshness: shuffle first, then a stable sort where unseen comes before seen, then a smaller seen timestamp (older) comes first, then `source === 'ai'` comes before bank
  - drill (a section is given): take the top `count`
  - otherwise: quota per section from `allocateBySection(count, sections)`; take the top of each section; fill any shortfall from the leftovers, ranked again
  - finally shuffle the picked list and `shuffleOptions` on each question

### 5.4 `scoring.js`
- `isCorrect(q, selected)`: the selected set equals the correct set exactly.
- `scoreItems(items, sections = SECTIONS)` → `{ correct, total, pct (rounded), perSection: {id:{correct,total}} (every section present), perSub: {code:{correct,total,topics:{topic:wrongCount}}}, wrongIds }`.
- `weakestSubs(perSub, n = 3)`: only subs with at least one wrong answer; sort by accuracy ascending, then total descending, then code; `topics` sorted by wrong count descending.
- `aggregateHistory(history, lastN = 10, sections)` → `{ attempts, recentCount, avgPct (null if no data), perSection, weakestSections (ids by accuracy asc, then id) }`. History rows store per-section results as `{ c, n }`.

### 5.5 `session.js`
- `EXAM_SECONDS = 7200`.
- `createSession({ mode, questions, section = null, now, exam = 'pmle', durationSec = EXAM_SECONDS })` → `{ exam, mode, section, startedAt: now, durationSec: mode==='exam' ? durationSec : null, index: 0, finishedAt: null, items: [{ q, selected: [], flagged: false, checked: false, reported: false, scored: false }] }`. Modes: `practice`, `exam`, `drill`, `retry`.
- `requiredSelections(q)` returns 2 for multi and 1 otherwise.
- `selectOption(s, i)`: ignored if the item is checked, reported or finished, or `i` is out of range. Single: replaces the selection. Multi: toggles, and a third pick is ignored. In non-exam modes, once the required count is reached, set `checked = true` (this locks the answer and reveals feedback). Exam mode never checks.
- `toggleFlag`, `moveTo` (clamped), `moveNext`, `movePrev`, `currentItem`.
- `remainingSec(s, now)`: `null` without a duration, else `max(0, duration − floor((now − startedAt)/1000))`. It uses wall-clock time, so a throttled tab still expires on time. `isExpired`.
- `answeredCount`, `flaggedCount`.
- `finalizeSession(s, now, sections)`: set `finishedAt`; every item `checked = true`; `scored = !reported && (examMode || selected.length > 0)` (so unanswered counts as wrong in an exam and is skipped elsewhere). Returns `scoreItems(scored items)` plus `skipped`, `reportedCount`, `wrongQuestions` (q objects) and `durationSec`.
- `summarizeAttempt(s, result)` → `{ t: startedAt, exam, mode, section, total, correct, pct, durationSec, perSection: {id:{c,n}} (non-empty only), perSub: {code:{c,n}} (non-empty only) }`.

### 5.6 `store.js` (viewer state)
Constants: `MAX_SEEN = 800`, `MAX_HISTORY = 150`, `MAX_REPORTED = 200`, `MAX_TOPICS = 60`, `SEEN_TTL_MS = 30 days`.
`REPORT_REASONS`:
```js
[{ id: 'incorrect', label: 'The marked answer is wrong' },
 { id: 'ambiguous', label: 'More than one answer is defensible' },
 { id: 'outdated', label: 'Outdated product name or feature' },
 { id: 'other', label: 'Something else' }]
```
- `emptyState()` → `{ v: 1, seen: {id: timestamp}, reported: {id: {t, reason, stem(≤160), sub}}, history: [], genTopics: [] }`.
- `sanitizeState(raw)`: tolerate junk; keep only valid numeric seen entries, cleaned reports (an unknown reason becomes `other`), history rows with numeric `t`, `total` and `correct` (the last 150), and string topics sliced to 80 chars (the last 60).
- `pruneState(state, now)`: expire seen entries older than 30 days; cap seen (keep the newest), reported (keep the newest by `t`), history and topics.
- `markSeen`, `reportQuestion(state, q, reason, now)`, `restoreQuestion`, `addAttempt` (ignore an attempt with total 0), `forgetSeen(state, predicate)`.
- `mergeStates(a, b)`: seen = max timestamp per id; reported = `b` overridden by `a`; history = union deduped by `` `${t}|${mode}|${total}|${correct}` ``, sorted by `t` and capped; topics = unique union of b then a, capped.
- `statesEqual(a, b)` uses `stableStringify`.
- `localBackend(storage, key = 'pmle.state.v1')` → `{ kind: 'local', load(), save() }`. Both are async and never throw.
- `dbBackend(db, uid, { wait })`: doc path `'data/users/' + uid + '/pmle'`; `load` → `snap.exists ? snap.data() : null`; `save` retries once after a random 400–1200 ms pause, only when the error code is `'unavailable'`.
- `multiBackend(backends)`: saves to all of them and throws the first rejection.
- `createPersister(backend, { onError })`: never overlaps writes and saves only the latest state (deep-clone on `save`, then a flush loop). Exposes `save(state)` and `idle()`.

### 5.7 `generate.js` (AI question writing and verification)
Constants: `LOAD_COUNT = 24` (first batch per exam per visit), `MORE_COUNT = 12` ("Write more").

`buildGenerationPrompt({ counts, avoid = [], nonce = '', exam = PMLE })`. Build these lines and join them with `\n`:
```
You write ORIGINAL practice questions for the ${exam.name} (${exam.code}) certification, based on the ${exam.guide}. Never reproduce real, leaked or "dump" exam questions.

Write exactly ${total} questions with this distribution:
- ${word} ${id} (${title}): ${n} question(s)        ← one line per section with n>0

Exam outline for these ${word.toLowerCase()}s (sub-objective code, title, topics):
${word} ${id}: ${title} (~${weight}% of the exam)
  ${code} ${subTitle}: ${topics.join('; ')}            ← per sub of that section

Product naming (mandatory):
- <each naming rule>

Quality rules:
1. Scenario-based: a specific company situation with concrete constraints (cost, latency, scale, compliance or minimal operational effort), ending with a direct question such as "What should you do?"
2. About one question in five is type "multi"; type "multi" has exactly ${exam.multiOptions} options with exactly 2 correct, and its stem ends with "Choose two." Type "single" has exactly 4 options with exactly 1 correct.
3. Every wrong option is a real ${exam.vendor} service or practice used in the wrong way or at the wrong time. No joke options. Keep options similar in length and do not make the correct one the longest by habit.
4. Exactly one defensible answer (two for multi). Check every answer against current ${exam.vendor} best practice. If you are not sure a fact is current, pick another topic.
5. "explanation": 2-4 sentences on why the correct option(s) are right. Each option has "why": one sentence; for wrong options say why it is wrong in this scenario.
6. Mix difficulty: about 25% easy, 50% medium, 25% hard. Vary industries (retail, healthcare, finance, manufacturing, media, public sector, gaming, logistics).
7. "topic" is a 3-8 word label for the specific skill tested. Avoid these recently used topics:
- <last 40 avoid topics, each sliced to 80 chars, or "- (none)">

Output format: JSON Lines. Print one complete JSON object per line and nothing else: no array brackets, no code fences, no commentary. Each object has exactly these fields (a single-answer example):
{"section":<firstActiveSection>,"sub":"<firstSubOfThatSection>","topic":"...","difficulty":"easy|medium|hard","type":"single|multi","stem":"...","options":[{"text":"...","correct":true,"why":"..."},{"text":"...","correct":false,"why":"..."},{…false…},{…false…}],"explanation":"..."}
"correct" must be the JSON boolean true or false. "sub" must be one of the codes listed above for its section.
Batch id: ${nonce}
```

`createLineParser(onItem)` → `{ push(delta), end() }`. Buffers partial lines. For each complete line: trim it; skip empty lines and lines starting with a ``` fence; strip a leading `[`, a trailing `,` and a trailing `]`; then `JSON.parse`. Call `onItem(obj)`, or `onItem(null)` if parsing fails.

`coerceGenerated(raw, exam)`: returns null for non-objects or an empty stem. Trims strings; strips a leading `§` from `sub`; if `section` is not an integer, infers it from the sub; option `correct` stays a boolean or becomes `null`. id = `'g-' + hashString(normalizeStem(stem))` for PMLE, `` `g-${exam.id}-` `` + hash for the others. Sets `source: 'ai'`; topic is sliced to 80; difficulty and type are lower-cased. Everything stays plain text.

`generateBatch(sample, { sections, counts, avoid, signal, onQuestion, exam })`: build the prompt for just these sections (nonce = `Math.random().toString(36).slice(2,10)`), then call `sample(prompt, { signal, cache: false, modelTier: 'default', onText: ({delta}) => parser.push(delta) })`, with `parser.end()` in a `finally`. Accept a question only when it coerces, its section is in this batch, its id is new in this batch and `validateQuestion` passes. Otherwise count it as rejected. Questions that streamed before a failure are kept. Returns `{ accepted, rejected, target }`.

**Verification:**
`buildVerifyPrompt(questions, exam)`. Each question block is:
```
Question ${i+1} (${multi ? 'choose two' : 'one answer'})
${stem}
A. ${option text}
B. …
```
(no answers, no `why`, no explanation). Full prompt:
```
You are an independent ${exam.vendor} expert checking practice questions for the ${exam.name} (${exam.code}) certification. The answer key is hidden from you.
For each question: work out the correct option letter(s) yourself, using current official documentation as your standard. Then check whether any statement in the question or its options is factually wrong or outdated today, and whether more options than asked could be defended.
Reply with only a JSON array, one object per question, in order:
[{"n":1,"answer":["B"],"confident":true,"issue":null}]
"answer" has exactly one letter for one-answer questions and exactly two for choose-two questions. "confident" is false if you are unsure. "issue" is null, or one sentence naming the factual error, the outdated fact or the second defensible answer.

<blocks joined by blank lines>
```
`judgeVerification(questions, verdicts)`: index verdicts by `Number(v.n)`. Keep a question (`{...q, verified: true}`) only if a verdict exists, the sorted upper-cased answer letters equal the sorted key letters, `confident === true` and `issue` is null or blank. Otherwise drop it with a reason: `'no verdict returned'`, `'verifier chose a different answer'`, `'verifier was not confident'` or the issue text. Returns `{ kept, dropped }`.
`verifyBatch(sample, questions, exam, signal)` → an empty result if there are no questions; else `sample.json(prompt, { signal, cache: false, modelTier: 'default' })` → judge.

### 5.8 `library.js` (saved verified questions)
- `LIB_CHUNK = 90`, `LIB_MAX = 180` per exam.
- `chunkList(list, size)`.
- `addToLibrary(library, questions)`: append only `verified` questions with new ids; keep the last 180.
- `sanitizeLibrary(raw, exam)`: keep items with `verified === true` that re-coerce and validate; keep the last 180.
- `localLibraryStore(storage)`: key `` `pmle.library.${examId}.v1` ``; `load`/`save` are async and swallow errors.
- `dbLibraryStore(db, uid)`: fixed chunk documents `` `data/users/${uid}/lib-${examId}-${i}` `` for i in 0..1, each `{ v: 1, items: [...] }`, so every doc stays under 256 KiB. `load` concatenates the chunks; `save` writes every chunk (an empty array when unused).

### 5.9 `providers.js` (bring your own key)
Wrap each provider in the **same shape as the claude.ai capability**: `sample(prompt, { onText, signal }) → { text, truncated: false }` and `sample.json(prompt, { signal }) → parsed JSON`.

```js
export const PROVIDERS = {
  gemini: { label: 'Gemini', defaultModel: 'gemini-3.8-flash' },
  anthropic: { label: 'Claude', defaultModel: 'claude-sonnet-5' },
  openai: { label: 'your OpenAI-compatible model', defaultModel: 'gpt-4o-mini' },
};
const MAX_OUTPUT_TOKENS = 16000;
```
(On the new machine, update the default model ids to whatever is current.)
- `providerLabel(config)`; an unknown provider falls back to gemini.
- `providerRequest(config, prompt, { stream, json })` → `{ url, headers, body }`. **The key always goes in a header, never in the URL.**
  - gemini: base = `config.endpoint || 'https://generativelanguage.googleapis.com/v1beta'` (trailing slashes stripped); url = `` `${base}/models/${encodeURIComponent(model)}:${stream ? 'streamGenerateContent?alt=sse' : 'generateContent'}` ``; header `x-goog-api-key`; body `{ contents:[{role:'user',parts:[{text:prompt}]}], generationConfig:{ maxOutputTokens, ...(json ? {responseMimeType:'application/json'} : {}) } }`.
  - anthropic: url = endpoint or `https://api.anthropic.com/v1/messages`; headers `x-api-key`, `anthropic-version: 2023-06-01`, `anthropic-dangerous-direct-browser-access: true`; body `{ model, max_tokens, messages:[{role:'user',content:prompt}], stream }`.
  - openai: url = endpoint or `https://api.openai.com/v1/chat/completions`; `Authorization: Bearer <key>`; body `{ model, messages:[…], stream }`.
- Stream text pickers: gemini `candidates[0].content.parts[].text` joined; anthropic `type==='content_block_delta' && delta.text`; openai `choices[0].delta.content`. Full-response pickers: gemini (same as the stream picker), anthropic `content[].text` joined, openai `choices[0].message.content`.
- `httpErrorCode(status)`: 401/403 → `bad_key`, 429 → `rate_limited`, otherwise `upstream_error`.
- An SSE reader (`res.body.getReader()` + `TextDecoder`) splits on `\n` and handles `data:` lines; it skips `[DONE]` and unparsable lines, accumulates text and calls `onText({ text, delta })`.
- `parseJsonReply(text)`: try `JSON.parse`; else slice from the first `[` or `{` to the last `]` or `}`; else throw `{ code: 'upstream_error', message: 'The reply was not JSON.' }`.
- `createAiSample(config, fetchImpl = fetch)`: null without a key. Errors are thrown as plain objects `{ code, message }`: `AbortError` → `cancelled`; a network error → `upstream_error`; a non-OK response → `httpErrorCode`, with the message taken from the error JSON. `sample` streams; `sample.json` doesn't stream and sets `json: true`.

---

## 6. Runtime orchestration (`src/runtime.js`)

`HIDE_CODES = ['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed']`.

- `makeSlot(bank)` → `{ bank, library: [], generated: [], pool: mergePool(bank, []), gen: { status: 'offline', phase: null, ready: 0, target: 0, rejected: 0, dropped: 0, note: '' }, genCtl: null }`. There is one slot per exam.
  Gen statuses: `offline | connecting | idle | running | done | unavailable | error`; `phase` is `null` or `'checking'`.
- `writerName(app)` → `providerLabel(app.aiConfig)` when the viewer is not on built-in Claude and has a key, else `'Claude'`.
- `capabilityGetter(claudeObj)` → `(name) => Promise` resolving `claudeObj.use(name)` or `null`, swallowing every error.
- `topicsFor(state, examId)`: genTopics are stored as `"<exam>|<topic>"`; unprefixed (legacy) entries count as PMLE. Returns the topics without the prefix.
- `connectStorage(app, { use, localB, onChange })`: fetch `use('user')` and `use('db')`; uid = `await user.id()`. Without db or uid → `storage = 'local'`. Otherwise set `app.libraryStore = dbLibraryStore(db, uid)`, load the remote state (on failure → local), `merged = mergeStates(remote || empty, app.state)`, `storage = 'db'`, persister = `createPersister(multiBackend([remote, local]), { onError: () => storage = 'local-fallback' })`. Write only if `merged` differs from the remote copy. Call `onChange('storage')`.
- `addGenerated(app, examId, q, onChange)`: reject a duplicate by id or normalized stem against the pool; push to `generated`; increment `gen.ready`; push `` `${examId}|${topic.slice(0,80)}` `` to genTopics; if the question is verified, add it to the library; rebuild the pool `mergePool(bank, [...library, ...generated])`; call `onChange('pool', examId)`.
- `runGeneration(app, { examId, total, onChange })`: return early without a sample or slot, or while one is already running. counts = `allocateBySection(total, exam.sections)`; batches = `exam.genBatches` if `total >= 18`, else one batch of all sections. Create an `AbortController`; status `running`; `target = ready + total`; avoid = the last 40 topics. Run the batches in parallel (`Promise.allSettled`). Each one: generate into a staging array → set `phase = 'checking'` → `verifyBatch` → add `dropped`, `addGenerated` each kept question. Afterwards: phase null; if `ready > 0`, `saveLibrary`; then map the failures to a status/note **in this priority order**:
  1. any `bad_key` → `error`, `` `${who} rejected the API key. Check it in AI Settings. Sessions use the built-in bank.` ``
  2. any HIDE_CODE → `unavailable`, `Fresh questions are turned off for this view, so sessions use the built-in bank.`
  3. any `rate_limited` → `error`, `` `${who} is rate-limited right now. Sessions use the built-in bank; try "Try again" later.` ``
  4. all failures are `cancelled` → `done`, `Stopped. Fresh questions written so far stay in the pool.`
  5. failures and `ready === 0` → `error`, `` `Could not reach ${who} for fresh questions. Sessions use the built-in bank.` ``
  6. no failures but 0 accepted → `error`, `None of the new questions passed both the format checks and the independent double-check, so none were added. Sessions use the checked bank.`
  7. otherwise `done`.
- `saveLibrary(app, examId)`: at most one write in flight per exam; a request made meanwhile sets an `again` flag and the write loops once more. Errors are swallowed.
- `loadLibraries(app, onChange)`: for each exam, load → `sanitizeLibrary` → merge into `slot.library` → rebuild the pool → `onChange('pool', id)`.
- `ensureGeneration(app, examId, onChange)`: only when status is `idle` → `runGeneration(total = LOAD_COUNT)`.
- `connectRuntime(app, { claudeObj, localB, onChange, aiConfig })`:
  - No `claudeObj`: with a key → `app.sample = createAiSample(aiConfig)`, every slot `idle`, storage local, then `ensureGeneration` for the current exam. Without a key → every slot `offline`.
  - With `claudeObj`: start `connectStorage(...).then(loadLibraries)`; `sample = await use('sample')`. If it is null → every slot `unavailable` with the note `Fresh questions need the Claude viewer, so sessions use the built-in bank.`; else `idle` + `ensureGeneration` for the current exam only. Await the storage work.

**The claude.ai capability contract** (only present when hosted as a claude.ai artifact): `window.claude.use(name)` returns a Promise for:
- `'user'` → `{ id(): Promise<string> }`
- `'db'` → `{ doc(path) → { get() → { exists, data() }, set(obj) } }` (Firestore-like; 256 KiB per document)
- `'sample'` → `sample(prompt, { signal, cache, modelTier, onText({text, delta}) }) → { text, truncated }` plus `sample.json(prompt, opts)`. Errors carry a `.code`.

On a normal PC/GitHub Pages this object does not exist, so the bring-your-own-key path is the main one.

---

## 7. App controller (`src/main.js`)

Storage keys: `pmle.prefs.v1`, `pmle.theme.v1`, `pmle.ai.v1`, `pmle.state.v1`, `pmle.library.<exam>.v1`.
Pref choices: `exam ∈ EXAMS keys`, `practiceCount ∈ [10,20,30]`, `drillSection ∈ [1..6]`, `drillCount ∈ [5,10,15]`. Defaults: `{ exam: 'pmle', practiceCount: 20, drillSection: 3, drillCount: 10 }`. Any saved value outside the choices falls back to the default.

`safeLocalStorage()` returns `window.localStorage` only if `getItem` works, else null.

`verifiedBank(bank, exam)` filters the bank through `validateQuestion` and `console.warn`s each skipped question.

The `app` object:
```js
{ view: 'home', examId: prefs.exam,
  slots: { pmle: makeSlot(verifiedBank(BANK, EXAMS.pmle)), saa: makeSlot(verifiedBank(AWS_BANK, EXAMS.saa)) },
  state: emptyState(), storage: 'local', persister: createPersister(localB), sample: null,
  session: null, result: null, reviewFilter: 'all', overlay: null, prefs, drawn: {},
  libraryStore: localLibraryStore(ls), aiConfig, builtInClaude: !!window.claude }
```
Views: `{ home: renderHome, quiz: renderQuiz, results: renderResults, history: renderHistory }`. Each renderer has the signature `(root, app, actions)` and rebuilds the whole `#app` with `mount`.

`render()`: call the view renderer. If an overlay is open, focus `.overlay input:checked, .overlay button`. If the quiz index changed, focus `#q-stem` with `preventScroll`. `scheduleRender()` coalesces renders with `requestAnimationFrame`.

`persist()` = `pruneState` + `persister.save`.

Timer: a 1 s `setInterval` only in exam mode. `tick()` updates `#timer` text with `fmtClock`, toggles the `low` class at ≤ 300 s, and calls `endSession()` on expiry. Also call `tick()` on `visibilitychange` when the tab becomes visible.

`startSession(mode, questions, section)`: with no questions, open a notice overlay titled `No questions available` with the text `Every question for this choice has been reported. Restore some from History, or pick another line.` Otherwise create the session (`exam: current.id`, `durationSec: exam.examSeconds`), reset result/filter/overlay, switch to the quiz view, start the timer, render and scroll to the top.

`endSession()`: stop the timer, `finalizeSession(..., examById(s.exam).sections)`, `addAttempt(summarizeAttempt)`, persist, switch to the results view.

`actions`:
- `goHome` / `showHistory`: while a ride is in progress (quiz view, not finished), open a `confirm-leave` overlay instead.
- `leaveSession`, `switchExam(id)` (saves the pref; results → home; `ensureGeneration` for the new exam)
- `startPractice` (count = prefs.practiceCount), `startExam` (count = exam.examQuestions), `startDrill(section)` (saves drillSection; count = prefs.drillCount), `retryWrong` (the result's wrong questions minus reported ones, options reshuffled)
- `setPref(k, v)`
- `choose(i)`: on the first selection of an item, `markSeen` + persist.
- `next`, `prev`, `goTo(i)`, `flag`
- `openReport(q)` → overlay `{type:'report', q, reason:'incorrect'}`; `submitReport(reason)` → `reportQuestion`, mark matching session items `reported`, persist, close, then auto-advance in the quiz if not on the last item.
- `closeOverlay`, `requestFinish` (exam → `confirm-finish` overlay with the unanswered/flagged counts; other modes → end immediately), `confirmFinish`, `setReviewFilter`
- `restoreReported(id)`, `clearSeenQuestions()` (forget seen ids for the current exam only, using `examOfQuestionId`)
- `generateMore()` → `runGeneration(total = MORE_COUNT)`; `stopGeneration()` → abort the current slot's controller
- `openAiSettings()` → overlay `{type:'ai-settings', provider (default 'gemini'), key, model, endpoint}`
- `saveAiSettings(cfg)`: ignored on built-in Claude; aborts every running generation. With a key: save it to localStorage, `createAiSample`, set every slot to `idle` with its note cleared, close, render, `ensureGeneration`. With null: remove the key, `sample = null`, every slot `offline`.
- `toggleTheme()`: flip `data-theme` on `<html>` (the current value, or the system preference if unset), save it, and return true if the page is now dark.

`onRuntimeChange(kind, examId)`: ignore events for a non-current exam, except `storage`. Get the plan from `runtimeRefresh(kind, view)`: `'full'` → `scheduleRender`; otherwise `refreshChips`, and for `'pool-panel'` replace `#source-panel` with a fresh `sourcePanel(app)`. **Streamed questions must not rebuild the page the viewer is using.**

Keyboard: one `keydown` listener → `keyAction(...)` → `preventDefault` + dispatch (`next` only if not on the last item).

`boot()`: `registerPwa()` (skipped on built-in Claude; adds `<link rel="manifest" href="manifest.json">` if missing; registers `./sw.js` on `load`, only over http(s)), apply the saved theme, render, then `localB.load()` → sanitize the state → re-render if on home. If there is no `window.claude`, `loadLibraries` from local. If there is one, set every slot to `connecting` and refresh the chips. Then `connectRuntime(...)`.

---

## 8. UI modules

### 8.1 `dom.js`
- `h(tag, attrs, ...children)`: an attribute whose key starts with `on` and has a function value becomes an event listener; `class` sets `className`; `true` sets an empty attribute; `null`/`false` are skipped. Children are flattened deeply; `null`/`false` are skipped; non-Nodes become **text nodes**.
- `svgEl(tag, attrs, ...children)`: the same in the SVG namespace.
- `mount(root, ...nodes)` → `root.replaceChildren(...)` (filters nulls).
- `fmtClock(sec)` → `MM:SS` (minutes can exceed 59).
- `LETTERS = ['A','B','C','D','E']`.

### 8.2 `keys.js` → `keyAction(e, ctx)`
`e = { key, ctrlKey, metaKey, altKey, targetTag, targetEditable }`, `ctx = { view, overlay }`. Any modifier → null. Overlay open → only `Escape` → `{type:'close'}`. INPUT/TEXTAREA/SELECT or contentEditable → null. Not in the quiz → null. `1`–`5` → `{type:'choose', index}`. `n`/`ArrowRight` → next, `p`/`ArrowLeft` → prev, `f` → flag (case-insensitive).

### 8.3 `viewmodels.js`
- `navigatorCells(session)`: per item `{ i, n, state: 'empty'|'answered'|'correct'|'wrong', section, current, flagged, reported }`. Correctness is shown only when the item is checked and has a selection, and **never during an unfinished exam**.
- `sectionBars(perSection, sections)` → `{ id, title, weight, correct, total, pct (null if total is 0) }` for every section.
- `lineChartPoints(values, { width, height, padX=32, padY=16 })`: x is spread evenly (a single point is centred); y maps 0–100 (clamped) into the padded area, with 100 at the top.
- `subLabel(code, subs)` → `"3.5 <title>"`, or the code if unknown.
- `runtimeRefresh(kind, view)`: storage on home/history → `'full'`; home → `'pool-panel'`; otherwise `'chips'`.
- `mapLayout(exam)`: width 760, top 44, rowGap 82, x0 60, terminusX = width − 118. Per section i: `y = top + i*rowGap`; stations = that section's sub codes; `start = x0 + 74 + i*26`; `spacing = min(128, (terminusX − 70 − start) / max(1, codes.length − 1 || 1))`; station x = `round(start + k*spacing)`. Returns `{ width, height: lastY + 64, lines: [{ id, title, weight, y, x0, stations: [{code, short, title, x, y}] }], terminus: { x, y1: firstY, y2: lastY } }`.
- `masteryBySub(history, examId, lastN=10)` → `{ code: { c, n, pct } }` over that exam's last N attempts (an attempt without `exam` counts as PMLE).

### 8.4 `chrome.js`
- `DISCLAIMER = 'Practice questions are original and aligned to the official exam guide; they are not actual exam questions.'`
- `MODE_NAMES = { practice: 'Practice', exam: 'Exam simulation', drill: 'Line drill', retry: 'Retry wrong answers' }`
- Store labels: `db: 'Progress synced to your account'`, `local: 'Progress saved in this browser'`, `'local-fallback': 'Sync failed, saved in this browser'`.
- Network switch labels: pmle → small "Google Cloud" / "ML Engineer"; saa → "AWS" / "Solutions Architect". Buttons use `aria-pressed`; the group has `aria-label="Choose an exam"`.
- `themeSwitch(actions)`: a `button.theme-switch` with `role="switch"`, `aria-checked`, `aria-label="Dark mode"`, title "Switch to light/dark mode", containing a sun SVG icon, a `.track` with a `.knob`, and a moon SVG icon. Clicking updates the attributes in place without re-rendering.
  - Sun: 24×24 viewBox, a circle r 4 at the centre plus 8 ray paths: `M12 3v2`, `M12 19v2`, `M3 12h2`, `M19 12h2`, `M5.6 5.6l1.4 1.4`, `M17 17l1.4 1.4`, `M5.6 18.4L7 17`, `M17 7l1.4-1.4`.
  - Moon: the path `M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z`, filled.
- Brand mark (38×22 SVG): a horizontal line `M3 11 H35` in `var(--l1)`, a vertical line `M19 3 V19` in `var(--l2)`, both 6 px wide with round caps, and a centre circle r 6 filled with `var(--panel)` and stroked with `var(--ink)`, width 3.
- `genChip(app, actions)` → `span#gen-chip[role=status][title=note]` with a dot class, a label and an optional link button:

| status | dot | label | button |
|---|---|---|---|
| offline | off | Checked bank only | "Connect AI" → openAiSettings (hidden on built-in Claude) |
| connecting | busy | Connecting to AI | – |
| idle | busy | Preparing fresh questions | – |
| running | busy | `Double-checking new questions: ${ready} confirmed` when phase is checking, else `Writing new questions: ${ready} of ${target} confirmed` | Stop |
| done | live if ready, else off | `${ready} double-checked questions this visit` or "Checked bank only" | Write more |
| unavailable | off | Checked bank only | "AI Settings" (not on built-in Claude) |
| error | as done | as done | Try again → generateMore |

- `storeChip(app)` → `span#store-chip` with a dot (live when the storage is db) and the label. `refreshChips` replaces both chips in place.
- `appHeader(app, actions)` → `header.topbar`: brand button ("Exam Lines", goes home), the network switch (hidden during a ride), `.status` (both chips), and `nav.topnav` with an "AI Settings" button (not on built-in Claude, `aria-label="AI question settings"`), a "History" button (`aria-current="page"` when on history) and the theme switch.
- `disclaimer()` → `footer.note`.
- `barList(bars, sectionWord)` → `.bars` > `.bar.l<id>`: `.num` (id), `.label` "`${word} ${id}: ${title}`", `.val` (`${pct}%` or "not ridden"), `.track[role=img]` with an inner span at `width:pct%`, and `.sub` "`${correct} of ${total} correct`".

### 8.5 `map.js`
`systemMap(exam, { mastery, onLine, draw, label })`: an SVG with `class="sysmap"` (plus ` draw` on the first view of an exam per visit, which runs the line-drawing animation). It contains:
- the terminus: a `rect.terminus` (x−8, y1−20, width 16, height y2−y1+40, rx 8), `text.tname` = exam code, `text.tsub` = "Exam day".
- per line, a `g.ln<i+1>.l<id>` (plus `.ride` if clickable: tabindex 0, role button, `aria-label="Ride <word> <id>, <title>, as a line drill"`, click/Enter/Space → `onLine(id)`) with: a `<title>` "`${word} ${id}: ${title} (about ${weight}% of the exam)`", `path.track` `M${x0} ${y} H${T.x}`, `g.badge` (circle r 17 at (28,y) and the number), and `text.ltitle` "`${title}, ~${weight}%`" at (x0+4, y−17).
- per station, a `g.station` with a `<title>` tooltip ("`${code} ${title}: ${pct}% of ${n} questions right`" or "`…: not practised yet`"), `circle.stop` r 10, a mastery `circle.fill` with `r = 2 + round(5.5*pct/100)` and `fill-opacity = 0.35 + 0.65*pct/100`, `text.scode` (y+28) and `text.sname` (y+43).

`mapLegend()` → `p.maplegend`: "Hollow station: not practised yet" / "Filled station: bigger and darker means more of its questions right".

### 8.6 `home.js`
- Masthead: h1 = `exam.name`; `` `Pick a line on the map to drill it, or buy a ticket below. Every line is one ${word} of the ${code} exam, and every station is one of its objectives.` ``; facts: **N** questions · **M** minutes · **K** `${word}s weighted like the ${guide}`.
- The map section (clickable lines start drills) + legend.
- Three tickets (`article.ticket` with a `.body` and a `.stub` showing a big number and a label):
  - Practice: stub = practiceCount / "stops"; body `See the answer and the reasoning for every option as soon as you choose.`; a Questions select (10/20/30); button `Start practice` (`#start-practice`).
  - Exam express: stub = examQuestions / `stops, ${min} min`; body `Timed and weighted like the real exam, with no feedback until you submit. Flag stops and jump along the route, then review everything.`; button `Start exam`.
  - Line drill: stub = drillCount / "stops"; body `Ride one line only, with instant feedback. You can also pick a line straight from the map.`; selects for the section (`Line ${id}: ${short}`) and the count (5/10/15); button `Start drill`.
- `.pair` of the **source panel** and the **progress panel**.
- `sourcePanel(app)` (`section#source-panel`, `aria-live=polite`), h2 `Where today’s questions come from`. Its first sentence depends on the status:
  - running + checking: `` `A second ${who} call is double-checking the new batch with the answers hidden: ${ready} confirmed so far.` ``
  - running: `` `${who} is writing a fresh batch for this visit right now: ${ready} of ${target} confirmed so far.` ``
  - idle/connecting: `` `${who} is about to write a fresh batch for this visit.` ``
  - ready > 0: `` `${who} wrote and double-checked ${ready} new questions for this visit` `` + optional `` `, and set aside ${dropped} that did not pass the check` `` + "."
  - offline: `Fresh questions need claude.ai or your own AI key in AI Settings, so this copy uses the checked bank only.`
  - otherwise the note, or `Fresh questions are not available right now, so sessions use the checked bank.`

  Then a `.facts-list` of five bullets, each coloured by a line class (l2, l5, l6, l3, l4):
  1. **Written fresh by {who}.** When you open an exam, the page asks {who} for new scenario questions {how}. Every request is new, never cached, and lists your recent topics so they are not repeated. ({how} = "with the API key you connected in AI Settings" or "through its built-in Claude access, on your own account at the default model tier")
  2. **Double-checked before use.** A second {who} call answers each new question with the answer key hidden. A question joins the pool only if that answer matches and no factual doubt is raised; the rest are set aside.
  3. **{library.length} saved in your library.** Double-checked questions are kept for future visits, up to 180 per exam, so your pool keeps growing.
  4. **Backed by {bank.length} checked questions.** A hand-written bank reviewed against the {guide} fills any gap and works offline.
  5. **Shuffled every ride.** Unseen questions come first, then the ones you saw longest ago, and answer order changes each time.

  Then a small line: `${pool} questions in the pool, ${seen} seen in the last 30 days, ${reported} reported and skipped.`, plus the note in `.warn` if one exists and ready > 0.
- Progress panel, h2 "Your journeys". With no history: `No journeys on this network yet. Your scores and weakest lines appear here after your first session.` Otherwise: `Last ride: ${pct}% on ${modeName}. Average ${avg}% over your last ${n}.`, an h3 "Lines to work on" with the weakest 3 bars, and a "See all journeys" button.

### 8.7 `quiz.js`
- **Route strip** (`nav.route`): an `ol` of stops, `li.l<section>` > `button.s` (classes answered/correct/wrong, flagged, reported, current; `id="stop-<i>"`; aria-label "Question n, unanswered|answered|correct|wrong[, flagged]"). The current stop shows its number; others show ✓ or ✕. After render, centre the current stop by setting `scrollLeft` on the strip (do not scroll the page).
- `.nowat`: a roundel (the section number, in the line colour) + station `b` "`${sub} ${short}`" and span "`${title}. ${topic}`"; meta: "`${MODE} , stop x of y, z answered`", a source tag (`Written by Claude, double-checked` / `Written by Claude` / `Checked bank`, with the `tag ai` class for AI), a difficulty tag, and the exam clock `#timer.clock` (`low` at ≤ 5 min).
- `p.stem#q-stem[tabindex=-1]`; for multi before reveal: `Select two options. ${n} of 2 selected.`
- Options are `button.opt` (`aria-pressed`, disabled after reveal or report), with a key circle (letter, or ✓/✕ after reveal) and a body (text + `why` after reveal, prefixed with **Right.** or **Your choice.**). The group's aria-label is "Choose one option" or "Choose two options".
- After reveal (non-exam): `.feedback` (`.bad` when wrong) with "Correct" or "Not quite" + the explanation.
- Toolbar: Previous, Flag for review / Flagged, Report this question / Reported, spacer, `Submit exam` or `End journey`, and `Next stop` (hidden on the last stop).
- `p.keyhints`: `Keys: 1 to ${n} answer, N next, P previous, F flag` (hidden on touch via `@media (hover:none)`).

### 8.8 `results.js`
- `.arrival`: a huge `${pct}%`; details `Journey report: ${mode}, ${code}`, `${correct} of ${total} scored stops correct, in ${clock}`, optional "N skipped and not scored" and "N reported and not scored"; buttons `Retry wrong answers (n)` (disabled at 0) and `Back to the map`.
- The map with this session's per-sub mastery (not clickable).
- A pair: `Score by ${word}` bars; `Weakest stations` (top 3 from `weakestSubs`: a roundel, the sub label, `${c} of ${n} correct. Missed: topic; topic`), or "No weak stations on this journey."
- "Every stop" with filter tabs `All stops / Missed / Flagged` (aria-pressed). Each `article.review.l<section>` shows: roundel, "Stop n", a verdict tag (Reported/Skipped/Correct/Missed/Unanswered), a Flagged tag, the sub label + topic, the stem, an `ol.ropts` (li.correct / li.chosen, letter, text + " Correct answer." / " Your answer." in `em`, and the why), the explanation, and a "Report this question" button.

### 8.9 `history.js`
Filter the history to the current exam. Show:
- The masthead "Your journeys": `${n} journeys on the ${code} network. Line scores cover your last ${k}.`, or `No journeys on the ${code} network yet. Switch networks at the top to see the other exam.`
- "Score over time": an SVG chart (640×220, padX 40, padY 20) with grid lines and tick labels at 0/25/50/75/100%, a polyline, dots (the last one bigger and filled, each with a `<title>` "Journey i of n: p%"), an end label, and "oldest"/"latest" labels. Use the last 30 attempts. Empty state: `Your score line appears after your first journey on this network.`
- "Weakest lines, last 10 journeys" (bars sorted ascending).
- "Reported questions": a list (stem + "…" when at 160 chars, the sub + reason label, a Restore button); empty: `Nothing reported. Use "Report this question" on anything that looks wrong.`; plus a `Forget seen questions (n)` button (disabled at 0).
- "Recent journeys" table: Date (`toLocaleString` month short, day, hour, minute), Ticket, Line ("Section 3" or "Whole network"), Score, Correct, Time.

### 8.10 `overlay.js` → `overlayLayer(app, actions)`
`div.overlay[role=dialog][aria-modal][aria-labelledby=ov-title]`; clicking the backdrop closes it. Inside is a `.overlay-card` with an h2, a body and a `.row.end` of buttons. Types:
- `report`: "Report this question"; `Reported questions are skipped in every future session. You can restore them from History.`; a fieldset "What is wrong with it?" with radio buttons for the 4 reasons; buttons Cancel / **Report and skip** (`btn stop`).
- `confirm-finish`: "Submit the exam?"; `${u} unanswered and ${f} flagged. Unanswered questions count as incorrect.`; Keep working / Submit exam.
- `confirm-leave`: "Leave this session?"; `Your answers in this session will not be scored or saved to your history.`; Stay / Leave session.
- `ai-settings`: "AI Question Generator"; `Connect an AI API key to write fresh scenario questions on each visit. The key is saved only in this browser and is sent only to the provider you choose (or the custom endpoint you enter), in a request header. Use a key with a spending limit, and clear it here on shared computers.` Fields: Provider select (Google Gemini (default …) / OpenAI / OpenRouter / Compatible / Anthropic Claude (default …)), API Key (a password input), Model Name (Optional), Custom Endpoint (Optional; placeholder `e.g. https://openrouter.ai/api/v1/chat/completions`). Buttons: Cancel / Clear / Bank only (`btn stop`) / Save & Connect (`btn go`). The inputs mutate a local form object that is passed to `saveAiSettings`.
- default notice: title + text + an OK button.

---

## 9. Styling (`src/styles.css`)

Font: **Overpass** (400/600/800) from Google Fonts, falling back to `"Segoe UI", system-ui, -apple-system, sans-serif`; `font-variant-numeric: tabular-nums`. Base: 16px/1.55. The `.app` container has `max-width: 1180px`, 16 px side padding (32 px from 760 px wide) and 48 px bottom padding. No horizontal page scroll at phone width: the map frame and the route strip scroll horizontally on their own.

Colour tokens on `:root`:

| token | light | dark |
|---|---|---|
| --paper | #F5F6F3 | #15181C |
| --panel | #FFFFFF | #1D2126 |
| --ink | #1B1F24 | #E8EAE6 |
| --ink-2 | #4A515A | #B4BAC0 |
| --ink-3 | #6E767F | #8C939A |
| --rule | #D5DAD4 | #333A42 |
| --rule-2 | #E7EAE5 | #262B31 |
| --on-line | #FFFFFF | #111417 |
| --l1 (red) | #D52B1E | #FF6B5F |
| --l2 (blue) | #0B5FA5 | #5AAEFF |
| --l3 (green) | #00864A | #3DD184 |
| --l4 (orange) | #D97800 | #FFAE45 |
| --l5 (purple) | #8C3C96 | #D08BDB |
| --l6 (teal) | #00838F | #3CCFDB |
| --ok | #0E7A3E | #44D07F |
| --bad | #C4271F | #FF7468 |
| --flag | #A45F00 | #FFB84D |
| --focus | #0B5FA5 | #5AAEFF |

The dark values apply under `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {…} }` **and** under `:root[data-theme="dark"]`. Set `color-scheme` accordingly. Classes `.l1`…`.l6` set `--line: var(--lN)`, so any component colours itself by section.

Design language: "signage plates". Buttons have a 2 px ink border and 6 px radius; `.btn.go` is a filled ink button; `.btn.quiet` has no border; `.btn.stop` has a red border. Panels are white cards with a 1 px rule and 8 px radius. Tickets have a 2 px ink border with a dashed-border stub on the right. The sticky top bar has a 2 px ink bottom border. Status dots: live = green, busy = orange and blinking, off = hollow. The map tracks are 9 px stroke in `--line` (13 px on hover/focus, dashed when focused), the badge circles are filled with the line colour, and stations are white circles with a 4 px line-coloured stroke. A draw animation (`stroke-dasharray: 1400`, a 1.1 s cubic-bezier, staggered 0.08 s per line) runs only with the `.draw` class. Quiz options: a grid with a 36 px key circle; the selected option is neutral ink (**line colours mean sections; red and green mean wrong and right**); correct/wrong borders and keys after reveal. The results score is huge (`clamp(64px, 11vw, 112px)`, weight 800). The overlay backdrop is `rgb(10 12 14 / .6)` and the card is at most 480 px wide. Show a `:focus-visible` 3 px focus outline everywhere. Honour `prefers-reduced-motion` (no animations; the map is fully drawn).

---

## 10. PWA and static assets

- `src/manifest.json`: name and short_name "Exam Lines"; description "Interactive transit-map certification practice for Google Cloud PMLE and AWS SAA-C03"; start_url `./index.html`; scope `./`; display standalone; background `#15181C`; theme `#1B1F24`; one icon `icon.svg`, sizes `any`, type `image/svg+xml`, purpose `any maskable`.
- `src/icon.svg` (512×512): a rounded rect (rx 104) in `#15181C`; a horizontal path `M 64 256 H 448` in `#D52B1E` and a vertical path `M 256 64 V 448` in `#0B5FA5`, both 52 px wide with round caps; a centre circle r 92 filled `#F5F6F3` with a `#1B1F24` 36 px stroke; an inner circle r 44 filled `#1B1F24`.
- `src/sw.js`: cache `exam-lines-v1`; precache `./`, `./index.html`, `./exam-lines.html`, `./manifest.json` and `./icon.svg`; on install, `skipWaiting`; on activate, delete old caches and `clients.claim`. On fetch: only same-origin GET requests and Google Fonts. Use stale-while-revalidate: return the cached copy and refresh it in the background; otherwise fetch and cache 200 responses. Never intercept the AI API calls.

---

## 11. Repo housekeeping files

- `.gitignore`: `dist/`, `node_modules/`, `.env` and `.env.*` (but keep `!.env.example`), `*.log`, `npm-debug.log*`, `.npm/`, `coverage/`, `.cache/`, `.vscode/`, `.idea/`, `*.swp`, `.DS_Store`, `Thumbs.db`, `desktop.ini`, `.superpowers/`, `.claude/`.
- `.env.example`: comments only. It explains that no environment variables are needed; that `npm test` and `npm run build` write `dist/exam-lines.html` and `dist/index.html`; that on claude.ai no key is needed; that in self-hosted copies each viewer pastes their own key in AI Settings; and that **a real key must never be committed**, because the build inlines the source into a public HTML file.
- `.github/workflows/deploy.yml` ("Test and Deploy"): runs on push to `main`, `master` and `feat/*`, on PRs to main/master, and on `workflow_dispatch`. Permissions: `contents: read`, `pages: write`, `id-token: write`; concurrency group `pages`. Job `test-and-build` (ubuntu-latest): checkout@v4 → setup-node@v4 (node 22) → `npm test` → `npm run build` → `upload-pages-artifact@v3` with `path: dist/` (main/master only). Job `deploy` (needs the first job, main/master only, environment `github-pages`): `deploy-pages@v4`.
- `docs/question-authoring.md`: the authoring rules from §12, written as a guide.

---

## 12. The question banks (the biggest job)

The original has **150 PMLE + 150 AWS hand-written, reviewed questions**. You must author them (original content, never copied exam dumps). The app works with fewer questions, but the tests below fix the exact counts. If you want to start smaller, write fewer and relax the counts in the bank tests temporarily, then fill them in later.

**Shape** of each question (no `source` field; the bank index adds `source: 'bank'`):
```js
{
  id: 'b1-01',            // PMLE: b<section>-<nn>; AWS: a<domain>-<nn>; two digits, array ordered by id
  section: 1,
  sub: '1.1',
  topic: 'Choosing BigQuery ML for SQL teams',   // 3–8 words, unique within the file
  difficulty: 'easy',     // easy | medium | hard (~25/50/25; every section has all three)
  type: 'single',         // single = 4 options / 1 correct; multi = 2 correct (PMLE 4 options, AWS 5 options)
  stem: 'A subscription retailer keeps two years of customer activity in BigQuery. Its analysts are fluent in SQL but have no Python experience. They need a churn classifier within a week, and leadership wants the least operational overhead possible. What should you do?',
  options: [
    { text: 'Train a boosted tree classifier with CREATE MODEL in BigQuery ML and score customers with ML.PREDICT.', correct: true, why: 'It keeps data and modeling in BigQuery and uses the SQL skills the team already has.' },
    { text: 'Export the tables to Cloud Storage as CSV and write a TensorFlow job on Agent Platform custom training.', correct: false, why: 'It needs Python and ML engineering skills the team lacks, and it adds data movement.' },
    { text: 'Build a Dataflow pipeline into Agent Platform Feature Store, then train with Agent Platform AutoML.', correct: false, why: 'It adds a pipeline and a feature store that this batch churn problem does not need.' },
    { text: 'Run a scikit-learn training container on GKE that reads from BigQuery on a nightly schedule.', correct: false, why: 'Cluster management and container code are the opposite of minimal operational overhead.' },
  ],
  explanation: 'BigQuery ML lets SQL users train classification models where the data already lives. CREATE MODEL with a BOOSTED_TREE_CLASSIFIER or LOGISTIC_REG model type, ML.EVALUATE and ML.PREDICT cover training, evaluation and batch scoring without exporting data or managing infrastructure.',
}
```
A multi stem ends with `Which two actions should you take? Choose two.`

Files and exports: `src/bank/section1.js` exports `BANK_S1` … `section6.js` exports `BANK_S6`; `src/bank/index.js` exports `BANK = [...S1..S6].map(q => ({ ...q, source: 'bank' }))`. Likewise `src/bank/aws/domain1.js` (`AWS_D1`) … `domain4.js` (`AWS_D4`) and `src/bank/aws/index.js` (`AWS_BANK`).

**Required counts:**

| bank | total | multi | per sub-objective |
|---|---|---|---|
| PMLE S1 | 19 | 4 | 1.1: 10, 1.2: 9 |
| PMLE S2 | 24 | 3 | 2.1: 9, 2.2: 7, 2.3: 8 |
| PMLE S3 | 31 | 4 | 3.1: 9, 3.2: 15, 3.3: 7 |
| PMLE S4 | 30 | 5 | 4.1: 15, 4.2: 15 |
| PMLE S5 | 27 | 4 | 5.1: 16, 5.2: 11 |
| PMLE S6 | 19 | 3 | 6.1: 10, 6.2: 9 |
| AWS D1 | 45 | 7 | 1.1: 16, 1.2: 16, 1.3: 13 |
| AWS D2 | 39 | 6 | 2.1: 20, 2.2: 19 |
| AWS D3 | 36 | 6 | 3.1: 8, 3.2: 7, 3.3: 8, 3.4: 7, 3.5: 6 |
| AWS D4 | 30 | 6 | 4.1: 8, 4.2: 8, 4.3: 7, 4.4: 7 |

**Mechanical rules** (enforced by `validateQuestion` + `test/helpers/bank.js`): stem ≥ 60 chars and contains `?`; explanation ≥ 40 chars; each `why` ≥ 15 chars; no stale names; the longest option ≤ 3× the shortest; across a section, the correct option may be the *strictly longest* option in at most 60% of single-answer questions (aim for every option within about 1.5× of the others); no duplicate stems or ids.

**Content rules:**
1. Scenario, constraint, question: a specific company situation with at least one concrete constraint (cost, latency, scale with a number, compliance, minimal ops), ending with a direct question, usually "What should you do?".
2. Exactly one defensible answer (two for "Choose two"). For every distractor, the stem must contain the constraint that rules it out.
3. Plausible near misses only: real services or practices used the wrong way or at the wrong time. No joke options.
4. No give-aways: the correct option is not the only long one, the only one with parameter names, or the only specific one. Distractors describe what they do, never why they are wrong.
5. Every sentence must be true. Each `why` is one sentence; the explanation is 2–4 sentences on the principle. Prefer mechanism-level statements over precise numbers.
6. Credit the right mechanism. For example, VPC Service Controls restricts data movement through Google APIs, while having no public IP is what blocks internet egress.
7. Use terms of art precisely (fixed, sliding and session windows; Multi-AZ standby vs Aurora Replicas; gateway vs interface endpoints).
8. State every premise the correct answer relies on. An option must never be "do what you already do".
9. Don't over-claim features: Feature Store serves features but does not compute them; OCR returns text, not labels.
10. Don't duplicate an existing scenario or skill.

**Current naming / facts:** use the naming rules in §4.2. Additionally:
- PMLE: built-in Agent Platform explanations (Sampled Shapley, integrated gradients, XRAI, example-based, feature attribution monitoring) were deprecated on March 16, 2026 and shut down on March 16, 2027. If an answer uses them, the explanation must say so; prefer BigQuery ML `ML.EXPLAIN_PREDICT`/`ML.GLOBAL_EXPLAIN` or open-source SHAP/LIME. Feature Store registers BigQuery tables/views as feature groups, uses offline serving over BigQuery for point-in-time training data, and online stores for serving; never "batch serving" or "read-instance lists". Cloud Run functions, LiteRT ("formerly TensorFlow Lite" only), and Sensitive Data Protection.
- AWS: gp3 goes up to 80,000 IOPS and 2,000 MiB/s (baseline 3,000 IOPS / 125 MiB/s) at single-digit-ms latency; io2 Block Express is for sub-ms. Snowball Edge has been available only to existing customers since November 2025; Snowmobile is retired. Database Savings Plans launched in December 2025; Compute Savings Plans still don't cover RDS. GuardDuty is Regional (organization settings apply per Region).
- Verify facts against cloud.google.com / docs.cloud.google.com and docs.aws.amazon.com. If you can't confirm a fact, rewrite the question around one you can.

Write the banks one file at a time and run that file's test after each file.

---

## 13. Tests (`test/`, run with `node --test`)

Helpers:
- `test/helpers/rand.js` → `mulberry32(seed)`: a seeded PRNG (`a += 0x6d2b79f5; t = imul(a ^ a>>>15, a|1); t ^= t + imul(t ^ t>>>7, t|61); return ((t ^ t>>>14)>>>0)/2**32`).
- `test/helpers/fixtures.js` → `subsForSection(id)`, `makeValidQuestion(overrides)` (id `b3-99`, section 3, sub 3.2, a hyperparameter-tuning scenario that passes validation, `source: 'bank'`), `makeGeneratedFor(section, i)` (a generated-shape question with option A correct and a unique stem/topic).
- `test/helpers/bank.js` → `checkSectionBank(bank, section, { count, multi, subs, exam, idPrefix = 'b' })`, which asserts every mechanical rule from §12.

Test files and what they must cover (write them; each is small):
- `util.test.js`: mulberry32 determinism; shuffle is a permutation and doesn't mutate; hash stability; normalizeStem; stableStringify ignores key order.
- `sections.test.js`: weights `[13,16,21,20,18,13]` (sum 101); 14 PMLE subs in order; each sub's section matches its code's first digit; GUIDE_DATE.
- `exams.test.js`: registry keys `['pmle','saa']`; SAA shape (65 questions, 7800 s, 5 multi options, weights 30/26/24/20, 14 subs in order); `examById('nope')` → PMLE; `allocateBySection(65, SAA)` = `{1:19,2:17,3:16,4:13}`; `examOfQuestionId` cases (`a3-17`→saa, `g-saa-1x2y`→saa, `b3-01`→pmle, `g-1x2y`→pmle); every section `short` is 1–20 chars.
- `validate.test.js`: a valid question passes; non-objects and missing fields fail; the answer key matches the type; exactly 4 distinct options; the sub belongs to the section; `?` and "Choose two" rules; stale names are rejected but "formerly Dataproc" is allowed; "Explainable AI" is flagged; AWS 5-option multi and AWS naming.
- `select.test.js`: the allocation cases above, and that the sums always equal n for 0..100; shuffleOptions keeps correct flags; mergePool dedupes by id and stem with the bank first; the exam pick uses quotas and excludes reported questions; a section shortfall is filled from the others; a drill on a fully reported section returns `[]`; the freshness ordering cases.
- `scoring.test.js`, `session.test.js`, `multi-exam.test.js`: as specified in §5.4–5.5 (exact-set correctness; per-section/per-sub breakdowns; weakestSubs ordering; aggregateHistory averages; practice locks after check; exam allows changes; multi toggle and third-pick-ignored; clamped navigation; wall-clock timer; exam finalize counts unanswered as wrong and excludes reported; practice finalize skips unanswered; the exact `summarizeAttempt` row shape; SAA sessions use 7800 s and 4 sections).
- `store.test.js`: sanitize junk; mutators; pruning and caps; a full state is under 256 KiB; merge; localBackend survives a throwing or missing storage; dbBackend path `data/users/<uid>/pmle` and one retry on `unavailable`; the persister never overlaps and saves only the latest state; multiBackend failure reaches `onError`; forgetSeen.
- `generate.test.js`: the prompt contains the distribution, outline, naming rules and format; the line parser handles split chunks, fences, brackets and bad lines; coerceGenerated ids by stem and keeps markup as plain text; generateBatch accepts valid in-scope lines and keeps questions streamed before a failure; the AWS prompt uses domains, the 5-option multi rule and AWS naming; AWS ids are `g-saa-…`.
- `verify.test.js`: the verify prompt hides the key and explanations; judgeVerification keeps only identical, confident, issue-free verdicts; verifyBatch makes one uncached `sample.json` call.
- `library.test.js`: chunkList; addToLibrary dedupes and caps at 180; sanitizeLibrary keeps only valid, verified questions; the local store round-trips and survives errors; the db store writes fixed chunk docs `data/users/<uid>/lib-<exam>-<i>`, each under 256 KiB.
- `providers.test.js`: createAiSample needs a key; the key travels in a header and never in the URL (for all 3 providers); streamed text is assembled per provider via `onText` (feed a fake `fetch` whose `body.getReader()` yields SSE bytes); HTTP 401/403/429/500 map to codes; JSON wrapped in a code fence still parses.
- `runtime.test.js`: use a fake db (a `Map` of docs recording writes) and a fake `sample` that reads the sections from the prompt (`/- (?:Section|Domain) (\d) \(/g`), emits 2 fixture questions per section as JSONL, and has a `.json` verifier that answers `['A']` for each `Question N (`. Cover: capabilityGetter; no runtime → offline; sample unavailable → unavailable with a note mentioning "built-in bank"; load-time generation only for the viewed exam (PMLE ends `done` with 12 generated); switching exams generates AWS once with `g-saa-` ids and `saa|` topics; failure codes map to statuses; legacy unprefixed topics stay PMLE; connectStorage merges and writes once, doesn't write when unchanged, and falls back without a uid; only verified questions join the pool and library; a failed double-check adds nothing; saved library questions load into the pool; aiConfig without claudeObj connects; a rejected key names the provider and mentions AI Settings.
- `viewmodels.test.js`: the navigator hides correctness during an exam; sectionBars nulls; lineChartPoints; subLabel and fmtClock; runtimeRefresh plans; mapLayout (one line per section, one station per sub, stations left of the terminus); masteryBySub per exam; route cells carry the section; LETTERS covers 5 options.
- `keys.test.js`: as in §8.2.
- `bank.test.js`, `bank-s1..s6.test.js`, `aws-bank.test.js`: the counts table in §12; the combined PMLE bank supports a full 50-question exam with `{1:7,2:8,3:10,4:10,5:9,6:6}` (seed 3); the AWS bank (150, every multi has 5 options) supports 65 questions with `{1:19,2:17,3:16,4:13}` (seed 5).
- `build.test.js`: stripModuleSyntax behaviour; every MODULE_ORDER file exists exactly once; the built page has `<title>Exam Lines</title>` in the first 8 KB, no doctype/html/head/body tags, exactly one `<script>` with no import/export lines, no innerHTML/insertAdjacentHTML/outerHTML/document.write, no alert/confirm/prompt; `new vm.Script(js)` compiles (this catches duplicate top-level names); the page is under 16 MB; the only `<link href>`s are Google Fonts.

---

## 14. Build order (phases)

1. **Scaffold:** package.json, .gitignore, .env.example, shell.html, a stub styles.css, build.mjs, test helpers. → `npm test` (build test only, with an empty-ish module list) passes.
2. **Data and pure logic:** sections, exams, util, validate, select, scoring, session, with their tests.
3. **State:** store and library, with their tests.
4. **AI:** generate (prompts, parser, coercion, verification) and providers, with their tests.
5. **Runtime:** runtime.js, with its tests (fakes only, no network).
6. **UI:** dom, keys, viewmodels (tests), chrome, overlay, map, home, quiz, results, history, then main.js. Add 3–5 placeholder bank questions per section so the app runs.
7. **Styles, PWA, icon, deploy workflow.** Run `npm run build` and open `dist/index.html` through a local static server (for example `npx serve dist` or `python -m http.server -d dist`). Check light/dark, phone width (no sideways scroll), keyboard shortcuts, each mode, results, history, report/restore, and AI Settings with a real key.
8. **Banks:** author all 300 questions section by section until every bank test passes.
9. **Final check:** `npm test` all green, `npm run build` prints the size, and deploy by pushing to `main` with GitHub Pages set to "GitHub Actions".

Definition of done: every test passes; the built single-file page works offline with the bank only; with an AI key it streams fresh questions, double-checks them, shows live chip/panel progress without disrupting the page, and saves verified questions to the library across reloads; and the exam timer, scoring, history and theme all behave as specified above.
