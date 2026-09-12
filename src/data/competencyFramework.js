// The competency model for India's Official Statistical System.
// Each node = a competency area. `prereq` builds the competency dependency graph
// used by the Competency Graph visual and the learning-path generator.

export const COMPETENCIES = [
  {
    id: 'basic-stats',
    label: 'Basic Statistics',
    prereq: [],
    subtopics: ['Measures of central tendency', 'Measures of dispersion', 'Frequency distributions'],
  },
  {
    id: 'probability',
    label: 'Probability',
    prereq: ['basic-stats'],
    subtopics: ['Probability rules', 'Random variables', 'Distributions (Normal, Binomial)'],
  },
  {
    id: 'data-collection',
    label: 'Data Collection & Survey Methods',
    prereq: ['basic-stats'],
    subtopics: ['Questionnaire design', 'Modes of data collection', 'Non-sampling errors'],
  },
  {
    id: 'sampling',
    label: 'Sampling Techniques',
    prereq: ['probability'],
    subtopics: [
      'Simple random sampling',
      'Systematic sampling',
      'Stratified sampling',
      'Cluster & multi-stage sampling',
    ],
  },
  {
    id: 'estimation',
    label: 'Estimation & Weighting',
    prereq: ['sampling'],
    subtopics: ['Design weights', 'Ratio & regression estimators', 'Sampling error & confidence intervals'],
  },
  {
    id: 'data-quality',
    label: 'Data Cleaning & Validation',
    prereq: ['data-collection'],
    subtopics: ['Edit checks', 'Outlier treatment', 'Imputation of missing values'],
  },
  {
    id: 'regression',
    label: 'Regression & Correlation',
    prereq: ['probability'],
    subtopics: ['Correlation', 'Simple linear regression', 'Interpreting coefficients'],
  },
  {
    id: 'visualization',
    label: 'Data Visualization & Dissemination',
    prereq: ['basic-stats'],
    subtopics: ['Choosing the right chart', 'Tables & metadata', 'Dashboards & reports'],
  },
  {
    id: 'standards-ethics',
    label: 'Statistical Standards & Ethics',
    prereq: [],
    subtopics: ['NSS / statistical standards', 'Confidentiality & data protection', 'Metadata & documentation'],
  },
]

export const COMPETENCY_BY_ID = Object.fromEntries(COMPETENCIES.map((c) => [c.id, c]))

export function labelFor(id) {
  return COMPETENCY_BY_ID[id]?.label || id
}

// Topological-ish order for laying out the graph and ordering the learning path.
export const COMPETENCY_ORDER = [
  'basic-stats',
  'probability',
  'data-collection',
  'sampling',
  'regression',
  'data-quality',
  'estimation',
  'visualization',
  'standards-ethics',
]
