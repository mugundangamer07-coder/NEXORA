// DEMO catalogue — modelled on the iGOT Karmayogi course structure.
// The app labels this clearly as sample data. lib/recommend.js is the single
// integration boundary: replace `getCatalogue()` with a live iGOT API call
// later and nothing else in the app changes.

export const IGOT_CATALOGUE = [
  {
    id: 'igot-101', title: 'Foundations of Statistics for Government Officers',
    provider: 'iGOT Karmayogi', tags: ['basic-stats'], level: 'Beginner',
    durationHrs: 4, rating: 4.6, format: 'Self-paced', url: 'https://igotkarmayogi.gov.in/#/course/demo-101',
  },
  {
    id: 'igot-102', title: 'Probability and Distributions in Practice',
    provider: 'iGOT Karmayogi', tags: ['probability'], level: 'Beginner',
    durationHrs: 5, rating: 4.4, format: 'Self-paced', url: 'https://igotkarmayogi.gov.in/#/course/demo-102',
  },
  {
    id: 'igot-201', title: 'Designing Household Surveys',
    provider: 'iGOT Karmayogi', tags: ['data-collection'], level: 'Intermediate',
    durationHrs: 6, rating: 4.7, format: 'Blended', url: 'https://igotkarmayogi.gov.in/#/course/demo-201',
  },
  {
    id: 'igot-202', title: 'Sampling Techniques for Official Surveys',
    provider: 'iGOT Karmayogi', tags: ['sampling'], level: 'Intermediate',
    durationHrs: 8, rating: 4.8, format: 'Self-paced', url: 'https://igotkarmayogi.gov.in/#/course/demo-202',
  },
  {
    id: 'igot-203', title: 'Stratified and Multi-stage Sampling Deep Dive',
    provider: 'iGOT Karmayogi', tags: ['sampling', 'estimation'], level: 'Advanced',
    durationHrs: 6, rating: 4.5, format: 'Instructor-led', url: 'https://igotkarmayogi.gov.in/#/course/demo-203',
  },
  {
    id: 'igot-204', title: 'Weighting and Estimation in Complex Surveys',
    provider: 'iGOT Karmayogi', tags: ['estimation'], level: 'Advanced',
    durationHrs: 7, rating: 4.6, format: 'Self-paced', url: 'https://igotkarmayogi.gov.in/#/course/demo-204',
  },
  {
    id: 'igot-301', title: 'Data Cleaning, Editing and Validation',
    provider: 'iGOT Karmayogi', tags: ['data-quality'], level: 'Intermediate',
    durationHrs: 5, rating: 4.3, format: 'Self-paced', url: 'https://igotkarmayogi.gov.in/#/course/demo-301',
  },
  {
    id: 'igot-302', title: 'Handling Missing Data and Outliers',
    provider: 'iGOT Karmayogi', tags: ['data-quality'], level: 'Advanced',
    durationHrs: 4, rating: 4.4, format: 'Self-paced', url: 'https://igotkarmayogi.gov.in/#/course/demo-302',
  },
  {
    id: 'igot-401', title: 'Regression and Correlation for Analysts',
    provider: 'iGOT Karmayogi', tags: ['regression'], level: 'Intermediate',
    durationHrs: 6, rating: 4.5, format: 'Blended', url: 'https://igotkarmayogi.gov.in/#/course/demo-401',
  },
  {
    id: 'igot-501', title: 'Data Visualization and Dissemination Standards',
    provider: 'iGOT Karmayogi', tags: ['visualization'], level: 'Beginner',
    durationHrs: 3, rating: 4.7, format: 'Self-paced', url: 'https://igotkarmayogi.gov.in/#/course/demo-501',
  },
  {
    id: 'igot-601', title: 'National Statistical Standards and Metadata',
    provider: 'iGOT Karmayogi', tags: ['standards-ethics'], level: 'Intermediate',
    durationHrs: 4, rating: 4.6, format: 'Self-paced', url: 'https://igotkarmayogi.gov.in/#/course/demo-601',
  },
  {
    id: 'igot-602', title: 'Data Confidentiality and the DPDP Act for Statisticians',
    provider: 'iGOT Karmayogi', tags: ['standards-ethics'], level: 'Beginner',
    durationHrs: 2, rating: 4.8, format: 'Self-paced', url: 'https://igotkarmayogi.gov.in/#/course/demo-602',
  },
]

// Simulated async "API" call so swapping in the real iGOT endpoint is trivial.
export async function getCatalogue() {
  await new Promise((r) => setTimeout(r, 250))
  return IGOT_CATALOGUE
}
