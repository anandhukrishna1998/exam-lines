import { SECTIONS, SUBOBJECTIVES, GUIDE_DATE } from './sections.js';

export const PMLE_NAMING = [
  'Gemini Enterprise Agent Platform (short form "Agent Platform"), never "Vertex AI"',
  'Agent Platform AutoML, Agent Platform Pipelines, Agent Platform custom training, Agent Platform Workbench, Colab Enterprise',
  'Agent Platform Feature Store, Agent Platform Model Registry, Model Monitoring on Agent Platform, Experiments on Agent Platform, Agent Platform ML Metadata',
  'Agent Platform Inference for online inference, batch inference, endpoints and explanations',
  'Model Garden, RAG Engine, Agent Platform Vector Search, Ray on Gemini Enterprise Agent Platform',
  'Managed Service for Apache Airflow (never "Cloud Composer"); Managed Service for Apache Spark (never "Dataproc")',
  'Sensitive Data Protection (never "Cloud DLP"); Cloud Run functions (never "Cloud Functions"); LiteRT for on-device models',
  'Unchanged names: BigQuery, BigQuery ML, Dataflow, Cloud Storage, Pub/Sub, Cloud Build, Artifact Registry, Cloud Run, GKE, Document AI, Vision API, Translation API, Model Armor, VPC Service Controls, Private Service Connect, Gemini, Imagen, Veo, Gemma',
  'For features without a product name, say "Agent Platform hyperparameter tuning job" or "the Agent Platform evaluation service"; never invent product names',
  'Built-in Agent Platform explanations (Sampled Shapley, integrated gradients, XRAI, feature attribution monitoring) were deprecated on March 16, 2026 and shut down on March 16, 2027; if a correct answer uses them, the explanation must say so. Prefer BigQuery ML ML.EXPLAIN_PREDICT or open-source SHAP or LIME',
  'Agent Platform Feature Store uses feature groups over BigQuery, offline serving for point-in-time training data and online stores for serving; never use the legacy terms "batch serving" or "read-instance list"',
];

export const PMLE_STALE = [
  { re: /\bVertex AI\b/i, use: 'Gemini Enterprise Agent Platform (Agent Platform)' },
  { re: /\bCloud Composer\b/i, use: 'Managed Service for Apache Airflow' },
  { re: /(?<!formerly )\bDataproc\b/i, use: 'Managed Service for Apache Spark' },
  { re: /\bCloud DLP\b/i, use: 'Sensitive Data Protection' },
  { re: /\bAI Platform\b/, use: 'Agent Platform' },
  { re: /\bCloud Functions\b/, use: 'Cloud Run functions' },
  { re: /\bExplainable AI\b/i, use: 'Agent Platform Inference explanations' },
];

export const SAA_SECTIONS = [
  { id: 1, short: 'Secure', title: 'Design Secure Architectures', weight: 30 },
  { id: 2, short: 'Resilient', title: 'Design Resilient Architectures', weight: 26 },
  { id: 3, short: 'High-performing', title: 'Design High-Performing Architectures', weight: 24 },
  { id: 4, short: 'Cost-optimized', title: 'Design Cost-Optimized Architectures', weight: 20 },
];

export const SAA_SUBS = {
  '1.1': {
    section: 1,
    short: 'Access',
    title: 'Design secure access to AWS resources',
    topics: [
      'IAM users, groups, roles and least-privilege policies',
      'MFA and root user protection',
      'AWS IAM Identity Center and federation',
      'Cross-account access with roles',
      'AWS Organizations and service control policies',
      'Resource-based policies'
    ]
  },
  '1.2': {
    section: 1,
    short: 'Workloads',
    title: 'Design secure workloads and applications',
    topics: [
      'Security groups and network ACLs',
      'Public and private subnets, NAT gateways and VPC endpoints',
      'AWS WAF, AWS Shield and Amazon GuardDuty',
      'AWS Secrets Manager and Parameter Store',
      'Amazon Cognito for application users'
    ]
  },
  '1.3': {
    section: 1,
    short: 'Data security',
    title: 'Determine appropriate data security controls',
    topics: [
      'Encryption at rest with AWS KMS',
      'Encryption in transit with TLS and AWS Certificate Manager',
      'S3 bucket policies, Block Public Access and Object Lock',
      'Key rotation and key policies',
      'Amazon Macie for sensitive data discovery',
      'Backups and data retention'
    ]
  },
  '2.1': {
    section: 2,
    short: 'Loose coupling',
    title: 'Design scalable and loosely coupled architectures',
    topics: [
      'Amazon SQS, Amazon SNS and Amazon EventBridge',
      'AWS Step Functions and AWS Lambda',
      'Amazon API Gateway',
      'EC2 Auto Scaling and Elastic Load Balancing',
      'Containers on Amazon ECS, Amazon EKS and AWS Fargate',
      'Caching and stateless design'
    ]
  },
  '2.2': {
    section: 2,
    short: 'High availability',
    title: 'Design highly available and/or fault-tolerant architectures',
    topics: [
      'Multi-AZ and multi-Region design',
      'Amazon Route 53 routing policies and health checks',
      'Amazon RDS Multi-AZ and Aurora replicas',
      'Disaster recovery strategies and RTO/RPO',
      'AWS Backup and cross-Region replication'
    ]
  },
  '3.1': {
    section: 3,
    short: 'Storage',
    title: 'Determine high-performing and/or scalable storage solutions',
    topics: [
      'Amazon S3 performance (multipart upload, Transfer Acceleration)',
      'Amazon EBS volume types',
      'Amazon EFS and Amazon FSx',
      'Instance store'
    ]
  },
  '3.2': {
    section: 3,
    short: 'Compute',
    title: 'Design high-performing and elastic compute solutions',
    topics: [
      'EC2 instance families and placement groups',
      'Auto Scaling policies',
      'AWS Lambda concurrency and memory',
      'AWS Batch and containers'
    ]
  },
  '3.3': {
    section: 3,
    short: 'Databases',
    title: 'Determine high-performing database solutions',
    topics: [
      'RDS and Aurora read replicas',
      'Amazon RDS Proxy',
      'Amazon DynamoDB capacity, indexes and DAX',
      'Amazon ElastiCache',
      'Aurora Serverless v2'
    ]
  },
  '3.4': {
    section: 3,
    short: 'Networking',
    title: 'Determine high-performing and/or scalable network architectures',
    topics: [
      'Amazon CloudFront and AWS Global Accelerator',
      'Load balancer types',
      'AWS Transit Gateway and VPC peering',
      'AWS Direct Connect and Site-to-Site VPN',
      'AWS PrivateLink'
    ]
  },
  '3.5': {
    section: 3,
    short: 'Ingestion',
    title: 'Determine high-performing data ingestion and transformation solutions',
    topics: [
      'Amazon Kinesis Data Streams and Amazon Data Firehose',
      'AWS Glue, Amazon Athena and Amazon EMR',
      'AWS Lake Formation',
      'AWS DataSync, AWS Transfer Family and offline transfer (AWS Snowball Edge for existing customers, AWS Data Transfer Terminal)',
      'Amazon Managed Service for Apache Flink'
    ]
  },
  '4.1': {
    section: 4,
    short: 'Storage cost',
    title: 'Design cost-optimized storage solutions',
    topics: [
      'S3 storage classes and S3 Intelligent-Tiering',
      'S3 Lifecycle policies',
      'EBS gp3 versus gp2 and snapshot management',
      'S3 Glacier storage classes'
    ]
  },
  '4.2': {
    section: 4,
    short: 'Compute cost',
    title: 'Design cost-optimized compute solutions',
    topics: [
      'Savings Plans and Reserved Instances',
      'Spot Instances',
      'Rightsizing with AWS Compute Optimizer',
      'AWS Graviton instances',
      'Lambda versus EC2 cost trade-offs'
    ]
  },
  '4.3': {
    section: 4,
    short: 'Database cost',
    title: 'Design cost-optimized database solutions',
    topics: [
      'Aurora Serverless v2 and reserved DB instances',
      'DynamoDB on-demand versus provisioned capacity',
      'Caching instead of scaling the database',
      'Backup retention costs'
    ]
  },
  '4.4': {
    section: 4,
    short: 'Network cost',
    title: 'Design cost-optimized network architectures',
    topics: [
      'Data transfer pricing between AZs and Regions',
      'NAT gateway costs and VPC gateway endpoints',
      'Amazon CloudFront to reduce data transfer out',
      'AWS Direct Connect versus VPN costs'
    ]
  }
};

export const SAA_NAMING = [
  'Use full current service names on first mention, e.g. Amazon S3, AWS Lambda, Amazon DynamoDB',
  'AWS IAM Identity Center (never "AWS SSO" or "AWS Single Sign-On")',
  'Amazon OpenSearch Service (never "Amazon Elasticsearch Service")',
  'Amazon EventBridge (never "CloudWatch Events")',
  'Amazon Data Firehose (never "Kinesis Data Firehose"); Amazon Managed Service for Apache Flink (never "Kinesis Data Analytics")',
  'Do not mention AWS Snowmobile, which is retired',
  'Stay within services that are in scope for the SAA-C03 exam',
  'Current limits: Amazon EBS gp3 scales to 80,000 IOPS and 2,000 MiB/s (use io2 Block Express when sub-millisecond latency is required); AWS Snowball Edge is available only to existing customers since November 2025',
];

export const SAA_STALE = [
  { re: /\bAWS (?:SSO|Single Sign-On)\b/, use: 'AWS IAM Identity Center' },
  { re: /\bElasticsearch Service\b/i, use: 'Amazon OpenSearch Service' },
  { re: /\bCloudWatch Events\b/i, use: 'Amazon EventBridge' },
  { re: /\bKinesis Data Firehose\b/i, use: 'Amazon Data Firehose' },
  { re: /\bKinesis Data Analytics\b/i, use: 'Amazon Managed Service for Apache Flink' },
  { re: /\bSnowmobile\b/i, use: 'AWS Snowball (Snowmobile is retired)' },
];

export const PMLE = {
  id: 'pmle',
  code: 'PMLE',
  vendor: 'Google Cloud',
  name: 'Google Cloud Professional Machine Learning Engineer',
  shortName: 'ML Engineer',
  guide: `exam guide of ${GUIDE_DATE}`,
  sectionWord: 'Section',
  examQuestions: 50,
  examSeconds: 120 * 60,
  multiOptions: 4,
  genBatches: [[1, 2, 3], [4, 5, 6]],
  sections: SECTIONS,
  subobjectives: SUBOBJECTIVES,
  namingRules: PMLE_NAMING,
  staleTerms: PMLE_STALE,
};

export const SAA = {
  id: 'saa',
  code: 'SAA-C03',
  vendor: 'AWS',
  name: 'AWS Certified Solutions Architect – Associate',
  shortName: 'Solutions Architect',
  guide: 'SAA-C03 exam guide',
  sectionWord: 'Domain',
  examQuestions: 65,
  examSeconds: 130 * 60,
  multiOptions: 5,
  genBatches: [[1, 2], [3, 4]],
  sections: SAA_SECTIONS,
  subobjectives: SAA_SUBS,
  namingRules: SAA_NAMING,
  staleTerms: SAA_STALE,
};

export const EXAMS = {
  pmle: PMLE,
  saa: SAA,
};

export function examById(id) {
  return EXAMS[id] || PMLE;
}

export function examOfQuestionId(id) {
  if (typeof id === 'string' && (/^a\d|^g-saa-/).test(id)) {
    return 'saa';
  }
  return 'pmle';
}
