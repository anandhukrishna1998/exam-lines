import { PMLE } from '../../src/js/exams.js';

export function subsForSection(id, exam = PMLE) {
  const codes = [];
  for (const [code, info] of Object.entries(exam.subobjectives)) {
    if (info.section === id) {
      codes.push(code);
    }
  }
  return codes;
}

export function makeValidQuestion(overrides = {}, exam = PMLE) {
  const base = {
    id: 'b3-99',
    section: 3,
    sub: '3.2',
    topic: 'Agent Platform hyperparameter tuning setup',
    difficulty: 'medium',
    type: 'single',
    stem: 'A machine learning team is training a PyTorch forecasting model on Agent Platform custom training. The training runs are failing due to suboptimal learning rates. What should you do to optimize hyperparameter tuning with minimal manual trial overhead?',
    options: [
      { text: 'Configure an Agent Platform hyperparameter tuning job with Bayesian optimization and early stopping.', correct: true, why: 'Bayesian optimization efficiently explores parameters and early stopping curtails poor runs.' },
      { text: 'Deploy an automated grid search script on a Compute Engine instance with custom shell loops.', correct: false, why: 'Manual virtual machines require excessive infrastructure maintenance compared to native tuning.' },
      { text: 'Retrain the model using BigQuery ML without setting any hyperparameter optimization arguments.', correct: false, why: 'BigQuery ML is not used for custom PyTorch forecasting training architectures here.' },
      { text: 'Use Cloud Run functions to trigger individual uncoordinated training runs for each parameter value.', correct: false, why: 'Cloud Run functions cannot coordinate hyperparameter trials or evaluate Bayesian metrics.' },
    ],
    explanation: 'Agent Platform hyperparameter tuning jobs automate the exploration of the search space using algorithms like Bayesian optimization. They automatically manage trial orchestration and report the best trials back to the console.',
    source: 'bank',
  };
  return { ...base, ...overrides };
}

export function makeGeneratedFor(section, i, exam = PMLE) {
  const subs = subsForSection(section, exam);
  const sub = subs[0] || `${section}.1`;
  const isMulti = false;
  return {
    id: exam.id === 'saa' ? `g-saa-${section}-${i}` : `g-${section}-${i}`,
    section,
    sub,
    topic: `Generated topic ${section} ${i}`,
    difficulty: 'medium',
    type: 'single',
    stem: `A production team needs to optimize operational throughput for component ${section}-${i} in their cloud environment. What should you do?`,
    options: [
      { text: `Apply the recommended cloud architecture best practice for component ${section}-${i} successfully.`, correct: true, why: 'This directly meets the operational throughput requirements for the business.' },
      { text: 'Disable all automated validation and continue deploying without monitoring or controls.', correct: false, why: 'Disabling validation compromises system reliability and fails operational goals.' },
      { text: 'Migrate all data manually using portable physical drives between corporate locations.', correct: false, why: 'Manual data movement creates severe bottlenecks and increases latency.' },
      { text: 'Reconfigure the core services to execute single-threaded batch scripts synchronously.', correct: false, why: 'Single-threaded execution cannot scale to meet high operational throughput.' },
    ],
    explanation: 'Using the cloud architecture best practice delivers high reliability, optimal latency, and minimal operational overhead according to current official documentation.',
    source: 'ai',
  };
}
