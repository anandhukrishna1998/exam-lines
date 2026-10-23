export const GUIDE_DATE = 'June 1, 2026';
export const SECTIONS = [
  { id: 1, short: 'Low-code AI', title: 'Architecting low-code AI solutions', weight: 13 },
  { id: 2, short: 'Data and models', title: 'Collaborating within and across teams to manage data and models', weight: 16 },
  { id: 3, short: 'Scaling prototypes', title: 'Scaling prototypes into ML models', weight: 21 },
  { id: 4, short: 'Serving and scaling', title: 'Serving and scaling models', weight: 20 },
  { id: 5, short: 'ML pipelines', title: 'Automating and orchestrating ML pipelines', weight: 18 },
  { id: 6, short: 'Monitoring AI', title: 'Monitoring AI solutions', weight: 13 },
];

export const SUBOBJECTIVES = {
  '1.1': {
    section: 1,
    short: 'Low-code models',
    title: 'Developing ML models with BigQuery ML or Agent Platform AutoML',
    topics: [
      'Choosing BigQuery ML or Agent Platform AutoML model types (classification, regression, forecasting, clustering) for the business problem',
      'Feature engineering and feature selection in BigQuery ML',
      'Generating predictions with BigQuery ML',
      'Training models with Agent Platform AutoML',
      'Fine-tuning Gemini models from BigQuery'
    ]
  },
  '1.2': {
    section: 1,
    short: 'AI APIs and models',
    title: 'Building AI solutions with Google Cloud AI APIs or foundation models',
    topics: [
      'Selecting the right model for a task from Model Garden',
      'Industry APIs such as Document AI, Vision API and Translation API',
      'Building and tuning solutions with Gemini, Imagen, Veo and models as a service in Model Garden',
      'Optimizing Gemini applications for cost, latency and availability'
    ]
  },
  '2.1': {
    section: 2,
    short: 'Data prep',
    title: 'Exploring and preprocessing data for ML',
    topics: [
      'Organizing tabular, text and image data for experimentation, training and serving',
      'Choosing BigQuery SQL, Dataflow, Apache Spark or in-memory Python by scale and complexity',
      'Creating and consolidating features in Agent Platform Feature Store',
      'Protecting privacy and handling PII'
    ]
  },
  '2.2': {
    section: 2,
    short: 'Notebooks',
    title: 'Prototyping models in notebooks',
    topics: [
      'Collaboration and security practices for Agent Platform Workbench and Colab Enterprise',
      'Developing with PyTorch, scikit-learn and JAX in notebooks',
      'Prototyping with foundation and open models from Model Garden'
    ]
  },
  '2.3': {
    section: 2,
    short: 'Experiments',
    title: 'Tracking and running ML experiments',
    topics: [
      'Choosing Experiments on Agent Platform, Agent Platform Pipelines or Kubeflow Pipelines for experimentation',
      'Evaluating predictive and gen AI solutions, including LLM-as-a-judge',
      'Tracking artifacts, versions and lineage with Experiments and Agent Platform ML Metadata'
    ]
  },
  '3.1': {
    section: 3,
    short: 'Model choice',
    title: 'Building models under cost, complexity, latency and scale constraints',
    topics: [
      'Choosing the model type (for example ARIMA, DNN or LLM)',
      'Choosing the product (Agent Platform AutoML, BigQuery ML or Agent Platform Pipelines)',
      'Choosing the deployment strategy',
      'Modeling techniques for interpretability requirements'
    ]
  },
  '3.2': {
    section: 3,
    short: 'Training',
    title: 'Training models',
    topics: [
      'Organizing training data in Cloud Storage and BigQuery',
      'Ingesting structured and unstructured data into training pipelines',
      'Training with Agent Platform custom training, Kubeflow on GKE, Agent Platform AutoML and Tabular Workflows',
      'Troubleshooting training failures',
      'Hyperparameter tuning',
      'Fine-tuning foundation models from Model Garden and deciding when tuning is warranted'
    ]
  },
  '3.3': {
    section: 3,
    short: 'Training hardware',
    title: 'Choosing hardware for training',
    topics: [
      'Comparing CPU, GPU and TPU options',
      'Distributed training with data and model parallelism on GPUs and TPUs'
    ]
  },
  '4.1': {
    section: 4,
    short: 'Serving',
    title: 'Serving models',
    topics: [
      'Batch and online inference on Agent Platform, Model Garden, Cloud Run and GKE',
      'Prebuilt and custom serving containers for PyTorch, XGBoost and other frameworks',
      'Organizing and versioning models in Agent Platform Model Registry',
      'Rollout strategies such as A/B testing and canary deployments',
      'Inference preprocessing and postprocessing'
    ]
  },
  '4.2': {
    section: 4,
    short: 'Scaling serving',
    title: 'Scaling online model serving',
    topics: [
      'Serving features with Agent Platform Feature Store',
      'Public and private endpoints',
      'Choosing CPU, GPU, TPU or edge hardware for serving',
      'Scaling the serving backend with Agent Platform Inference and containerized serving',
      'Tuning models for production training and serving'
    ]
  },
  '5.1': {
    section: 5,
    short: 'Pipelines',
    title: 'Developing end-to-end ML pipelines',
    topics: [
      'Validating data and models',
      'Orchestrating with Agent Platform Pipelines, Managed Service for Apache Airflow or Ray on Gemini Enterprise Agent Platform',
      'Keeping preprocessing consistent between training and serving'
    ]
  },
  '5.2': {
    section: 5,
    short: 'Retraining',
    title: 'Automating model retraining',
    topics: [
      'Choosing a retraining policy',
      'CI/CD/CT deployment with Cloud Build'
    ]
  },
  '6.1': {
    section: 6,
    short: 'AI risks',
    title: 'Identifying risks to AI solutions',
    topics: [
      'Preventing data exfiltration, malicious prompting and sensitive-data leaks with regex, safety filters and Model Armor',
      'Responsible AI practices such as bias monitoring',
      'Model explainability with Agent Platform Inference'
    ]
  },
  '6.2': {
    section: 6,
    short: 'Monitoring',
    title: 'Monitoring, testing and troubleshooting AI solutions',
    topics: [
      'Model Monitoring on Agent Platform and continuous evaluation metrics',
      'Training-serving skew, data drift, concept drift and feature attribution drift',
      'Monitoring, testing and evaluating gen AI solutions'
    ]
  }
};
