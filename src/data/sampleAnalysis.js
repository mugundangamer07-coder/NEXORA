// OFFLINE FALLBACK — used when no Gemini API key is set, or a live call fails.
// Represents a pre-analyzed learning document so the full demo works with zero
// internet. When a key IS present, lib/gemini.js produces this same shape live.

export const SAMPLE_DOCUMENT = {
  name: 'NSSO Manual — Sampling Methods for Official Surveys (sample).pdf',
  pages: 42,
  source: 'bundled-sample',
}

export const SAMPLE_TOPIC_MAP = {
  documentName: SAMPLE_DOCUMENT.name,
  overallDifficulty: 'Medium',
  summary:
    'The material covers probability sampling designs used in large-scale official surveys — simple random, systematic, stratified and multi-stage sampling — along with design weights, estimation of sampling error, and the control of non-sampling errors during field data collection.',
  topics: [
    {
      id: 'sampling',
      label: 'Sampling Techniques',
      difficulty: 'Medium',
      subtopics: ['Simple random sampling', 'Systematic sampling', 'Stratified sampling', 'Cluster & multi-stage sampling'],
      concepts: ['Sampling frame', 'Probability proportional to size', 'Design effect', 'Sampling fraction'],
    },
    {
      id: 'estimation',
      label: 'Estimation & Weighting',
      difficulty: 'Hard',
      subtopics: ['Design weights', 'Ratio & regression estimators', 'Sampling error & confidence intervals'],
      concepts: ['Inflation factor', 'Standard error', 'Relative standard error', 'Confidence interval'],
    },
    {
      id: 'data-collection',
      label: 'Data Collection & Survey Methods',
      difficulty: 'Easy',
      subtopics: ['Questionnaire design', 'Modes of data collection', 'Non-sampling errors'],
      concepts: ['Response error', 'Coverage error', 'Field supervision'],
    },
    {
      id: 'data-quality',
      label: 'Data Cleaning & Validation',
      difficulty: 'Medium',
      subtopics: ['Edit checks', 'Outlier treatment', 'Imputation of missing values'],
      concepts: ['Consistency edits', 'Range checks', 'Hot-deck imputation'],
    },
  ],
}

// Question bank. `topic` matches a competency id in competencyFramework.js.
// `answer` is the 0-based index of the correct option.
export const SAMPLE_QUESTION_BANK = [
  {
    id: 'q1', topic: 'sampling', subtopic: 'Simple random sampling', difficulty: 'Easy',
    question: 'In simple random sampling without replacement, every possible sample of a given size has:',
    options: ['A higher chance if it contains rare units', 'An equal probability of being selected', 'A probability proportional to its mean', 'Zero probability unless stratified'],
    answer: 1,
    explanation: 'SRS without replacement gives every distinct sample of size n the same selection probability; this is the defining property of the design.',
  },
  {
    id: 'q2', topic: 'sampling', subtopic: 'Sampling frame', difficulty: 'Easy',
    question: 'A "sampling frame" in an official survey is:',
    options: ['The final estimate of the population total', 'The list or device from which the sample is drawn', 'The questionnaire used by enumerators', 'The confidence interval around a proportion'],
    answer: 1,
    explanation: 'The frame is the operational representation of the population — a list, map or set of area units — from which sampling units are actually selected. Frame gaps cause coverage error.',
  },
  {
    id: 'q3', topic: 'sampling', subtopic: 'Systematic sampling', difficulty: 'Medium',
    question: 'A survey selects every 20th household after a random start. The main risk of this systematic design is:',
    options: ['It cannot produce unbiased estimates', 'Periodicity in the frame aligning with the interval', 'It always needs a larger sample than SRS', 'It cannot be combined with stratification'],
    answer: 1,
    explanation: 'If the list has a cyclical pattern whose period matches (or divides) the sampling interval, the sample can systematically over- or under-represent certain units.',
  },
  {
    id: 'q4', topic: 'sampling', subtopic: 'Stratified sampling', difficulty: 'Medium',
    question: 'Stratified sampling improves precision most when:',
    options: ['Strata are internally homogeneous and differ from each other', 'All strata are identical in every characteristic', 'Strata are formed randomly after data collection', 'The number of strata equals the sample size'],
    answer: 0,
    explanation: 'Precision gains come from low within-stratum variance and high between-stratum variance, so the design removes between-group variation from the sampling error.',
  },
  {
    id: 'q5', topic: 'sampling', subtopic: 'Stratified sampling', difficulty: 'Hard',
    question: 'Under Neyman (optimum) allocation, a stratum receives a larger share of the sample when it has:',
    options: ['Smaller size and smaller variability', 'Larger size and larger standard deviation', 'A mean close to the overall mean', 'The lowest data-collection cost only'],
    answer: 1,
    explanation: 'Neyman allocation is proportional to N_h × S_h — larger and more variable strata get more sample so that overall variance is minimised for a fixed total sample size.',
  },
  {
    id: 'q6', topic: 'sampling', subtopic: 'Cluster & multi-stage sampling', difficulty: 'Medium',
    question: 'Compared with simple random sampling of the same size, cluster sampling usually has:',
    options: ['Lower cost but larger sampling error', 'Lower cost and lower sampling error', 'Higher cost but no design effect', 'Identical precision in all cases'],
    answer: 0,
    explanation: 'Units within a cluster tend to be similar, so a cluster sample carries less information than an SRS of equal size (design effect > 1), but fieldwork is far cheaper.',
  },
  {
    id: 'q7', topic: 'sampling', subtopic: 'Cluster & multi-stage sampling', difficulty: 'Hard',
    question: 'In a two-stage design, first-stage units (villages) are selected with probability proportional to size and a fixed number of households is taken per village. A key reason for PPS at the first stage is:',
    options: ['To make every household have an approximately equal overall selection probability', 'To guarantee the largest villages are always excluded', 'To remove the need for design weights', 'To eliminate non-sampling error'],
    answer: 0,
    explanation: 'PPS at stage one combined with a fixed take per unit at stage two makes the overall probability of selection roughly self-weighting across households.',
  },
  {
    id: 'q8', topic: 'sampling', subtopic: 'Design effect', difficulty: 'Hard',
    question: 'A design effect (DEFF) of 2.5 for an estimate means:',
    options: ['The estimate is biased by 250%', 'The variance is 2.5 times that of an SRS of the same size', 'The sample must be reduced by 60%', 'The response rate was 40%'],
    answer: 1,
    explanation: 'DEFF is the ratio of the variance under the actual complex design to the variance under SRS of the same sample size; 2.5 means the effective sample size is n / 2.5.',
  },
  {
    id: 'q9', topic: 'estimation', subtopic: 'Design weights', difficulty: 'Medium',
    question: 'A household is selected with overall probability 1/500. Its design (inflation) weight is:',
    options: ['500', '1/500', '0.002 divided by the population', '250'],
    answer: 0,
    explanation: 'The base design weight is the reciprocal of the selection probability, so 1 / (1/500) = 500 — each sampled household represents about 500 in the population.',
  },
  {
    id: 'q10', topic: 'estimation', subtopic: 'Sampling error & confidence intervals', difficulty: 'Medium',
    question: 'The relative standard error (RSE) of an estimate is:',
    options: ['The standard error divided by the estimate, as a percentage', 'The estimate divided by the sample size', 'The bias divided by the variance', 'Always below 1% in official surveys'],
    answer: 0,
    explanation: 'RSE = SE(estimate) / estimate, usually expressed as a percent. Statistical offices often flag estimates with RSE above a threshold (e.g. 15–25%) as unreliable.',
  },
  {
    id: 'q11', topic: 'estimation', subtopic: 'Sampling error & confidence intervals', difficulty: 'Hard',
    question: 'An estimated unemployment rate is 7.0% with a standard error of 0.5 percentage points. An approximate 95% confidence interval is:',
    options: ['6.0% to 8.0%', '6.9% to 7.1%', '5.5% to 8.5%', '7.0% exactly, no interval needed'],
    answer: 0,
    explanation: 'A 95% interval is roughly estimate ± 1.96 × SE ≈ 7.0 ± 1.0, giving about 6.0% to 8.0%.',
  },
  {
    id: 'q12', topic: 'estimation', subtopic: 'Ratio & regression estimators', difficulty: 'Hard',
    question: 'A ratio estimator is most efficient when:',
    options: ['The study variable is roughly proportional to the auxiliary variable through the origin', 'The auxiliary variable is unknown for the population', 'The sample is very small and unstratified', 'The two variables are completely uncorrelated'],
    answer: 0,
    explanation: 'The ratio estimator gains precision when y ≈ R·x with the line passing near the origin, so a strong positive proportional relationship with a known population total of x is ideal.',
  },
  {
    id: 'q13', topic: 'data-collection', subtopic: 'Non-sampling errors', difficulty: 'Easy',
    question: 'Which of the following is a NON-sampling error?',
    options: ['Variation because only a sample, not the whole population, was surveyed', 'Enumerators recording responses in the wrong unit', 'The width of the 95% confidence interval', 'The design effect of a cluster sample'],
    answer: 1,
    explanation: 'Non-sampling errors arise from coverage, response, measurement and processing problems — they occur even in a complete census. Sampling error is only about observing a sample.',
  },
  {
    id: 'q14', topic: 'data-collection', subtopic: 'Modes of data collection', difficulty: 'Easy',
    question: 'A key advantage of Computer Assisted Personal Interviewing (CAPI) over paper schedules is:',
    options: ['It removes the need for a sampling frame', 'Built-in edit checks catch inconsistent entries during the interview', 'It guarantees a 100% response rate', 'It eliminates the need for design weights'],
    answer: 1,
    explanation: 'CAPI applies range and consistency checks at the point of data capture, reducing processing and response errors before the enumerator leaves the household.',
  },
  {
    id: 'q15', topic: 'data-collection', subtopic: 'Questionnaire design', difficulty: 'Medium',
    question: 'A "leading question" in a survey schedule is problematic because it:',
    options: ['Takes too long to administer', 'Pushes the respondent toward a particular answer, biasing responses', 'Cannot be coded numerically', 'Requires a larger sample size'],
    answer: 1,
    explanation: 'Leading or loaded wording introduces measurement bias by suggesting the "expected" answer, systematically distorting the distribution of responses.',
  },
  {
    id: 'q16', topic: 'data-collection', subtopic: 'Coverage error', difficulty: 'Medium',
    question: 'Under-coverage in a household survey means:',
    options: ['Some population units have no chance of selection because they are missing from the frame', 'Too many households were selected', 'The questionnaire had too many items', 'The confidence interval is too narrow'],
    answer: 0,
    explanation: 'Under-coverage is a frame defect: eligible units are absent from the frame and therefore cannot be sampled, which can bias estimates if those units differ systematically.',
  },
  {
    id: 'q17', topic: 'data-quality', subtopic: 'Edit checks', difficulty: 'Easy',
    question: 'A "range check" during data validation verifies that:',
    options: ['A value lies within a plausible minimum and maximum', 'Two related answers do not contradict each other', 'The sample covers the full geographic range', 'The estimate matches last year exactly'],
    answer: 0,
    explanation: 'A range (or validity) check confirms each field falls within acceptable bounds — e.g. age between 0 and 120. Cross-field contradictions are caught by consistency edits.',
  },
  {
    id: 'q18', topic: 'data-quality', subtopic: 'Imputation of missing values', difficulty: 'Medium',
    question: 'Hot-deck imputation fills a missing value by:',
    options: ['Deleting the whole record', 'Borrowing a value from a similar responding unit in the same dataset', 'Setting it to zero', 'Using the overall population total'],
    answer: 1,
    explanation: 'Hot-deck methods donate a value from a "similar" respondent (matched on auxiliary variables) in the current survey, preserving the variable’s distribution better than mean imputation.',
  },
  {
    id: 'q19', topic: 'data-quality', subtopic: 'Outlier treatment', difficulty: 'Hard',
    question: 'In official statistics, a genuine but extreme value from a large enterprise is best handled by:',
    options: ['Dropping it silently from the dataset', 'Winsorising or reducing its weight while documenting the decision', 'Replacing it with the median for all units', 'Ignoring it and publishing without review'],
    answer: 1,
    explanation: 'A true outlier should not simply be deleted; controlled treatment (winsorisation, weight trimming) with documentation keeps the estimate stable without discarding real information.',
  },
  {
    id: 'q20', topic: 'sampling', subtopic: 'Sampling fraction', difficulty: 'Easy',
    question: 'If 2,000 households are selected from a population of 1,000,000, the sampling fraction is:',
    options: ['1 in 500', '1 in 50', '1 in 5,000', '2 in 100'],
    answer: 0,
    explanation: 'The sampling fraction is n / N = 2,000 / 1,000,000 = 1/500.',
  },
]
