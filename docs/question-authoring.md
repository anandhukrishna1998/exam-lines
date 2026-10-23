# Question Authoring Guide for Exam Lines

This guide documents the technical, mechanical, and content rules for authoring certification practice questions for **Exam Lines** across Google Cloud PMLE and AWS SAA-C03.

---

## 1. Ground Rules & Integrity
- **100% Original Content**: Never reproduce actual, leaked, or dump exam questions. Every question must be an original scenario.
- **Official Documentation Baseline**: Validate every technical claim against official vendor documentation (`docs.cloud.google.com` or `docs.aws.amazon.com`).
- **Current Terminology Only**: Follow modern product naming standards and avoid all deprecated or stale terms.

---

## 2. Mechanical Schema & Thresholds
Every question object in the bank must adhere to this exact structure:

```js
{
  id: 'b1-01',           // PMLE: b<section>-<nn>; AWS: a<domain>-<nn>; two-digit sequence
  section: 1,            // Integer matching section or domain ID
  sub: '1.1',            // Matching valid sub-objective code
  topic: 'Choosing BigQuery ML for SQL teams', // 3 to 8 words
  difficulty: 'easy',    // 'easy' | 'medium' | 'hard' (~25/50/25 distribution)
  type: 'single',        // 'single' (4 options, 1 correct) | 'multi' (PMLE: 4 options, 2 correct; AWS: 5 options, 2 correct)
  stem: '...',           // >= 60 characters and must contain a question mark '?'
  options: [
    { text: '...', correct: true, why: '...' },  // why >= 15 characters
    { text: '...', correct: false, why: '...' },
    // ...
  ],
  explanation: '...',    // >= 40 characters
}
```

### Constraints Checklist
- **Stem Length**: Minimum 60 characters, must contain `?`. For type `multi`, the stem must end with `Which two actions should you take? Choose two.` or match `/choose two/i`.
- **Option Counts**:
  - Single: Exactly 4 options, exactly 1 marked `correct: true`.
  - Multi (PMLE): Exactly 4 options, exactly 2 marked `correct: true`.
  - Multi (AWS): Exactly 5 options, exactly 2 marked `correct: true`.
- **Option Length Symmetry**: The longest option must be $\le 3\times$ the length of the shortest option.
- **No Longest-Option Bias**: Across any section or domain, the correct option may be the *strictly longest* option in at most 60% of single-answer questions.
- **Unique Texts**: No duplicate options within a question after whitespace and case normalization.

---

## 3. Product Naming Rules

### Google Cloud PMLE:
- Use **Gemini Enterprise Agent Platform** (short form: **Agent Platform**), never *Vertex AI* or *AI Platform*.
- Use **Managed Service for Apache Airflow**, never *Cloud Composer*.
- Use **Managed Service for Apache Spark**, never *Dataproc* (unless explicitly writing "formerly Dataproc").
- Use **Sensitive Data Protection**, never *Cloud DLP*.
- Use **Cloud Run functions**, never *Cloud Functions*.
- Use **LiteRT** for on-device inference (never bare *TensorFlow Lite*).
- Built-in Agent Platform explanations (Sampled Shapley, integrated gradients, XRAI) were deprecated in 2026. Prefer BigQuery ML `ML.EXPLAIN_PREDICT` or open-source SHAP / LIME.
- Agent Platform Feature Store uses BigQuery feature groups, offline serving, and online stores (never legacy "batch serving" or "read-instance lists").

### AWS SAA-C03:
- Use full official service names on first mention: **Amazon S3**, **AWS Lambda**, **Amazon DynamoDB**, **Amazon EC2**.
- Use **AWS IAM Identity Center**, never *AWS SSO* or *AWS Single Sign-On*.
- Use **Amazon OpenSearch Service**, never *Amazon Elasticsearch Service*.
- Use **Amazon EventBridge**, never *CloudWatch Events*.
- Use **Amazon Data Firehose**, never *Kinesis Data Firehose*.
- Use **Amazon Managed Service for Apache Flink**, never *Kinesis Data Analytics*.
- Do not reference *AWS Snowmobile* (retired). Use *AWS Snowball Edge* or *AWS Data Transfer Terminal*.
- Current limits: Amazon EBS gp3 scales up to 80,000 IOPS and 2,000 MiB/s. Use io2 Block Express only when sub-millisecond latency is required.

---

## 4. Scenario Quality
1. **Scenario-Based**: Present a concrete business context with explicit constraints (cost, latency, scale, operational overhead, compliance).
2. **Plausible Distractors**: Wrong options must describe real services used incorrectly or violating a constraint. Never author joke options.
3. **Concise Explanations**: Provide 2–4 sentences detailing why the correct choice meets the constraints and why alternatives fail.
