# CivicFix AI Triage & Duplicate Engine Benchmark Report

> **Execution Timestamp**: `2026-11-02 01:12:37`  
> **Dataset**: `docs/evaluation/test_set.csv` (`100` synthetic labelled test samples)  
> **Evaluation Rigor**: 100% computed from automated execution. No numbers or metrics in this document were estimated or fabricated.

---

## Evaluation Limitations & Methodology Caveats

> [!WARNING]
> 1. **Synthetic Dataset & Internal Authoring Bias**: The 100 evaluation cases in `docs/evaluation/test_set.csv` are **synthetic** and were written by the same team that built the engine and lexicon. Consequently, these results are not an independent estimate of real-world accuracy on actual citizen submissions.
> 2. **Small Duplicate Sample & High Statistical Uncertainty**: The duplicate benchmark contains only **10 true duplicate pairs** (out of 4,950 total candidate pairs). Because the ground-truth duplicate sample is so small (n = 10), precision and recall numbers are very uncertain (see 95% Wilson confidence intervals below).
> 3. **Text-Only Modality**: Triage uses text only (complaint title and description). It does not analyze uploaded photograph pixels, acoustic sensor recordings, or historical ward defect density.

---

## 1. Executive Summary & Benchmark Comparison

| Model / Baseline | Category Accuracy | 95% Wilson CI | Macro Precision | Macro Recall | Macro F1 | Weighted F1 |
|---|---|---|---|---|---|---|
| **DeterministicTriageEngine (Production)** | **87.00%** | **[79.02%, 92.24%]** | **86.81%** | **87.64%** | **86.67%** | **87.05%** |
| First-Keyword Match Baseline | 63.00% | [53.22%, 71.82%] | 86.67% | 63.15% | 66.17% | 64.81% |
| Majority-Class Baseline (`STREET_LIGHT`) | 19.00% | [12.51%, 27.78%] | 2.71% | 14.29% | 4.56% | 6.07% |

### Key Observations
- **Engine vs Baselines**: The `DeterministicTriageEngine` achieved **87.00% category accuracy** (95% Wilson CI: [79.02%, 92.24%]), outperforming the naive First-Keyword baseline (**63.00%**) by **+24.00%** and the Majority-Class baseline (**19.00%**) by **+68.00%**.
- **Weighted Specificity**: The 2x title weighting and 3x multi-word phrase weighting in the production engine effectively resolve token competition in standard reports, whereas the naive first-keyword baseline arbitrarily selects whichever token appears first.
- **Priority Prediction**: Priority classification reached **76.00% accuracy** (Macro-F1: **57.39%**) across CRITICAL, HIGH, MEDIUM, and LOW tiers.

---

## 2. Per-Category Performance Metrics (Production Engine)

| Category | Support | TP | FP | FN | Precision | Recall | F1 Score |
|---|---|---|---|---|---|---|---|
| `ROADS` | 16 | 16 | 3 | 0 | 84.21% | 100.00% | 91.43% |
| `WATER_SEWERAGE` | 17 | 14 | 1 | 3 | 93.33% | 82.35% | 87.50% |
| `STREET_LIGHT` | 19 | 17 | 0 | 2 | 100.00% | 89.47% | 94.44% |
| `GARBAGE` | 12 | 10 | 1 | 2 | 90.91% | 83.33% | 86.96% |
| `DRAINAGE` | 17 | 13 | 4 | 4 | 76.47% | 76.47% | 76.47% |
| `PUBLIC_TRANSPORT` | 8 | 8 | 3 | 0 | 72.73% | 100.00% | 84.21% |
| `PARKS` | 11 | 9 | 1 | 2 | 90.00% | 81.82% | 85.71% |
| **Macro Average** | **100** | - | - | - | **86.81%** | **87.64%** | **86.67%** |
| **Weighted Average** | **100** | - | - | - | **87.97%** | **87.00%** | **87.05%** |

---

## 3. Category Confusion Matrix

Columns represent **Predicted Category**, Rows represent **Actual Ground Truth Category**:

| Actual \ Predicted | ROADS | WATER | STREET_LIGHT | GARBAGE | DRAINAGE | TRANS | PARKS |
|---|---|---|---|---|---|---|---|
| **`ROADS`** | 16 | 0 | 0 | 0 | 0 | 0 | 0 |
| **`WATER`** | 0 | 14 | 0 | 0 | 2 | 1 | 0 |
| **`LIGHT`** | 0 | 0 | 17 | 0 | 0 | 2 | 0 |
| **`GARBAGE`** | 0 | 0 | 0 | 10 | 2 | 0 | 0 |
| **`DRAIN`** | 1 | 1 | 0 | 1 | 13 | 0 | 1 |
| **`TRANS`** | 0 | 0 | 0 | 0 | 0 | 8 | 0 |
| **`PARKS`** | 2 | 0 | 0 | 0 | 0 | 0 | 9 |

---

## 4. Priority Classification & Confusion

- **Overall Priority Accuracy**: `76.00%` (vs Majority-Class Baseline `43.00%`)
- **Priority Macro-F1**: `57.39%` (vs Majority-Class Baseline `15.03%`)
- **Per-Class Recall**: CRITICAL: 23 of 25 (92.00%), HIGH: 10 of 26 (38.46%), MEDIUM: 43 of 43 (100.00%), LOW: 0 of 6 (0.00%).

> **Recall Imbalance Analysis**: In this evaluation, LOW recall is 0 of 6 (0.00%) and HIGH recall is 10 of 26 (38.46%). The deterministic engine lacks low-severity de-escalation heuristics (so all LOW complaints default to MEDIUM), and frequently under-prioritizes HIGH complaints when specific arterial road or school zone trigger tokens are missing.

### Priority Benchmark vs Majority-Class Baseline

| Model / Baseline | Priority Accuracy | Priority Macro-F1 | Macro Precision | Macro Recall |
|---|---|---|---|---|
| **DeterministicTriageEngine (Production)** | **76.00%** | **57.39%** | **66.04%** | **57.62%** |
| Majority-Class Baseline (`MEDIUM`) | 43.00% | 15.03% | 10.75% | 25.00% |

### Per-Priority Tier Performance Metrics (Production Engine)

| Priority Tier | Support | TP | FP | FN | Precision | Recall | F1 Score |
|---|---|---|---|---|---|---|---|
| `CRITICAL` | 25 | 23 | 0 | 2 | 100.00% | 92.00% | 95.83% |
| `HIGH` | 26 | 10 | 0 | 16 | 100.00% | 38.46% | 55.56% |
| `MEDIUM` | 43 | 43 | 24 | 0 | 64.18% | 100.00% | 78.18% |
| `LOW` | 6 | 0 | 0 | 6 | 0.00% | 0.00% | 0.00% |
| **Macro Average** | **100** | - | - | - | **66.04%** | **57.62%** | **57.39%** |

### Priority Confusion Matrix

Columns represent **Predicted Priority**, Rows represent **Actual Ground Truth Priority**:

| Actual \ Predicted | CRITICAL | HIGH | MEDIUM | LOW |
|---|---|---|---|---|
| **`CRITICAL`** | 23 | 0 | 2 | 0 |
| **`HIGH`** | 0 | 10 | 16 | 0 |
| **`MEDIUM`** | 0 | 0 | 43 | 0 |
| **`LOW`** | 0 | 0 | 6 | 0 |

---

## 5. Duplicate Detection Performance

Pairwise evaluation across all **4,950 candidate pairs** in the 100-complaint test set:

| Metric | Computed Value | 95% Wilson CI | Description |
|---|---|---|---|
| **Total Pairs Evaluated** | `4950` | - | Full pairwise combination (100 * 99 / 2) |
| **True Ground-Truth Duplicates** | `10` | - | 10 designated duplicate pairs |
| **Candidate Duplicates Predicted** | `9` | - | Total pairs flagged by engine |
| **True Positives (TP)** | `7` | - | Actual duplicates correctly flagged |
| **False Positives (FP)** | `2` | - | Non-duplicates incorrectly flagged |
| **False Negatives (FN)** | `3` | - | Actual duplicates missed |
| **True Negatives (TN)** | `4938` | - | Non-duplicates correctly dismissed |
| **Precision** | **77.78%** | **[45.26%, 93.68%]** | Accuracy of duplicate alerts (`TP / (TP + FP)`) |
| **Recall** | **70.00%** | **[39.68%, 89.22%]** | Coverage of duplicate detection (`TP / (TP + FN)`) |
| **F1 Score** | **73.68%** | - | Harmonic mean of duplicate precision & recall |

---

## 6. Detailed Failure Case Analysis & Inherent Limits of Rule-Based Triage

Out of 100 test samples, the engine exhibited mismatches on **34 cases** (category mismatch, priority divergence, or both):

| ID | Case Type | Expected | Predicted | Diagnostic Explanation |
|---|---|---|---|---|
| `#04` | `DUPLICATE` | `WATER_SEWERAGE (HIGH)` | `WATER_SEWERAGE (MEDIUM)` | Under-prioritized: Road or utility disruption lacked explicit arterial/school zone trigger keyword. |
| `#19` | `DUPLICATE` | `WATER_SEWERAGE (CRITICAL)` | `WATER_SEWERAGE (MEDIUM)` | Missed Critical escalation: Hazard rule required exact trigger phrase that was paraphrased or misspelled. |
| `#21` | `AMBIGUOUS` | `WATER_SEWERAGE (HIGH)` | `WATER_SEWERAGE (MEDIUM)` | Under-prioritized: Road or utility disruption lacked explicit arterial/school zone trigger keyword. |
| `#22` | `AMBIGUOUS` | `GARBAGE (MEDIUM)` | `DRAINAGE (MEDIUM)` | Multi-concept conflict: Tokens from multiple municipal domains competed (e.g. tree vs lamppost, or garbage vs drain). |
| `#24` | `AMBIGUOUS` | `WATER_SEWERAGE (HIGH)` | `PUBLIC_TRANSPORT (MEDIUM)` | Multi-concept conflict: Tokens from multiple municipal domains competed (e.g. tree vs lamppost, or garbage vs drain). Under-prioritized: Road or utility disruption lacked explicit arterial/school zone trigger keyword. |
| `#25` | `AMBIGUOUS` | `DRAINAGE (CRITICAL)` | `PARKS (CRITICAL)` | Multi-concept conflict: Tokens from multiple municipal domains competed (e.g. tree vs lamppost, or garbage vs drain). |
| `#26` | `AMBIGUOUS` | `DRAINAGE (HIGH)` | `DRAINAGE (MEDIUM)` | Under-prioritized: Road or utility disruption lacked explicit arterial/school zone trigger keyword. |
| `#28` | `AMBIGUOUS` | `DRAINAGE (MEDIUM)` | `GARBAGE (MEDIUM)` | Multi-concept conflict: Tokens from multiple municipal domains competed (e.g. tree vs lamppost, or garbage vs drain). |
| `#29` | `AMBIGUOUS` | `STREET_LIGHT (CRITICAL)` | `PUBLIC_TRANSPORT (CRITICAL)` | Multi-concept conflict: Tokens from multiple municipal domains competed (e.g. tree vs lamppost, or garbage vs drain). |
| `#30` | `AMBIGUOUS` | `PARKS (LOW)` | `ROADS (MEDIUM)` | Multi-concept conflict: Tokens from multiple municipal domains competed (e.g. tree vs lamppost, or garbage vs drain). Engine baseline bias: Defaulted to standard MEDIUM priority when no low-severity heuristic exists. |
| `#34` | `AMBIGUOUS` | `GARBAGE (MEDIUM)` | `DRAINAGE (MEDIUM)` | Multi-concept conflict: Tokens from multiple municipal domains competed (e.g. tree vs lamppost, or garbage vs drain). |
| `#35` | `AMBIGUOUS` | `DRAINAGE (HIGH)` | `DRAINAGE (MEDIUM)` | Under-prioritized: Road or utility disruption lacked explicit arterial/school zone trigger keyword. |
| `#38` | `SPELLING_ERROR` | `WATER_SEWERAGE (HIGH)` | `WATER_SEWERAGE (MEDIUM)` | Under-prioritized: Road or utility disruption lacked explicit arterial/school zone trigger keyword. |
| `#49` | `SPELLING_ERROR` | `PARKS (HIGH)` | `ROADS (HIGH)` | Spelling distortion prevented exact keyword match; engine defaulted or matched secondary token. |
| `#52` | `MIXED_TAMIL_ENGLISH` | `WATER_SEWERAGE (HIGH)` | `WATER_SEWERAGE (MEDIUM)` | Under-prioritized: Road or utility disruption lacked explicit arterial/school zone trigger keyword. |
| `#55` | `MIXED_TAMIL_ENGLISH` | `DRAINAGE (HIGH)` | `DRAINAGE (MEDIUM)` | Under-prioritized: Road or utility disruption lacked explicit arterial/school zone trigger keyword. |
| `#57` | `MIXED_TAMIL_ENGLISH` | `PARKS (HIGH)` | `PARKS (MEDIUM)` | Under-prioritized: Road or utility disruption lacked explicit arterial/school zone trigger keyword. |
| `#58` | `MIXED_TAMIL_ENGLISH` | `ROADS (HIGH)` | `ROADS (MEDIUM)` | Under-prioritized: Road or utility disruption lacked explicit arterial/school zone trigger keyword. |
| `#59` | `MIXED_TAMIL_ENGLISH` | `WATER_SEWERAGE (CRITICAL)` | `WATER_SEWERAGE (MEDIUM)` | Missed Critical escalation: Hazard rule required exact trigger phrase that was paraphrased or misspelled. |
| `#63` | `MIXED_TAMIL_ENGLISH` | `STREET_LIGHT (CRITICAL)` | `PUBLIC_TRANSPORT (CRITICAL)` | Vocabulary gap: Tamil morphological variant or terminology absent from CivicLexicon keyword list. |
| `#67` | `PURE_TAMIL` | `WATER_SEWERAGE (HIGH)` | `WATER_SEWERAGE (MEDIUM)` | Under-prioritized: Road or utility disruption lacked explicit arterial/school zone trigger keyword. |
| `#70` | `PURE_TAMIL` | `DRAINAGE (HIGH)` | `DRAINAGE (MEDIUM)` | Under-prioritized: Road or utility disruption lacked explicit arterial/school zone trigger keyword. |
| `#73` | `PURE_TAMIL` | `DRAINAGE (CRITICAL)` | `WATER_SEWERAGE (CRITICAL)` | Vocabulary gap: Tamil morphological variant or terminology absent from CivicLexicon keyword list. |
| `#76` | `PURE_TAMIL` | `WATER_SEWERAGE (MEDIUM)` | `DRAINAGE (MEDIUM)` | Vocabulary gap: Tamil morphological variant or terminology absent from CivicLexicon keyword list. |
| `#82` | `STANDARD` | `ROADS (LOW)` | `ROADS (MEDIUM)` | Engine baseline bias: Defaulted to standard MEDIUM priority when no low-severity heuristic exists. |
| `#83` | `STANDARD` | `ROADS (HIGH)` | `ROADS (MEDIUM)` | Under-prioritized: Road or utility disruption lacked explicit arterial/school zone trigger keyword. |
| `#86` | `STANDARD` | `WATER_SEWERAGE (HIGH)` | `DRAINAGE (MEDIUM)` | Sub-optimal keyword density: Secondary domain terms outweighed primary cause. Under-prioritized: Road or utility disruption lacked explicit arterial/school zone trigger keyword. |
| `#87` | `STANDARD` | `STREET_LIGHT (LOW)` | `STREET_LIGHT (MEDIUM)` | Engine baseline bias: Defaulted to standard MEDIUM priority when no low-severity heuristic exists. |
| `#93` | `STANDARD` | `DRAINAGE (HIGH)` | `DRAINAGE (MEDIUM)` | Under-prioritized: Road or utility disruption lacked explicit arterial/school zone trigger keyword. |
| `#94` | `STANDARD` | `DRAINAGE (HIGH)` | `DRAINAGE (MEDIUM)` | Under-prioritized: Road or utility disruption lacked explicit arterial/school zone trigger keyword. |
| `#95` | `STANDARD` | `DRAINAGE (CRITICAL)` | `ROADS (CRITICAL)` | Sub-optimal keyword density: Secondary domain terms outweighed primary cause. |
| `#97` | `STANDARD` | `PUBLIC_TRANSPORT (LOW)` | `PUBLIC_TRANSPORT (MEDIUM)` | Engine baseline bias: Defaulted to standard MEDIUM priority when no low-severity heuristic exists. |
| `#98` | `STANDARD` | `PUBLIC_TRANSPORT (LOW)` | `PUBLIC_TRANSPORT (MEDIUM)` | Engine baseline bias: Defaulted to standard MEDIUM priority when no low-severity heuristic exists. |
| `#100` | `STANDARD` | `PARKS (LOW)` | `PARKS (MEDIUM)` | Engine baseline bias: Defaulted to standard MEDIUM priority when no low-severity heuristic exists. |

### Technical Limits Revealed by Failure Cases

1. **Brittleness to Lexical Variance & Spelling Distortions**:
   - Complaints with colloquial phonetic spelling (e.g. `"pot hole"` as two separate words, `"crator"`, `"stret ligt"`, `"pipline"`, `"garbeg"`) fail to trigger exact keyword substrings. In rule-based architectures, missing exact n-grams forces the engine to fall back to default categories (e.g., `ROADS`) or latch onto accidental secondary tokens.

2. **Cross-Domain Multi-Concept Ambiguity**:
   - Real-world civic issues frequently span multiple infrastructure domains (e.g. `"Garbage dumped inside stormwater drain canal"`, `"Fallen tree branch smashed streetlight pole"`, `"Water pipe burst washing away asphalt on main road"`). The deterministic engine computes keyword counts, but cannot discern the *root cause* vs *consequence* (e.g., whether the primary ticket should go to Conservancy/Garbage or Highways/Drainage).

3. **Cross-Language Code-Switching & Tamil Morphology**:
   - Tamil is an agglutinative language where suffixes attach to nouns (e.g., `சாலையில்`, `குழாயில்`, `குப்பையை`). Without a morphological lemmatizer or sub-word embeddings, exact keyword matching misses inflected forms unless every inflection is manually enumerated in `CivicLexicon`.

4. **Context-Insensitive Hazard Escalation**:
   - Hazard rules operate on static trigger strings (`"live wire"`, `"open manhole"`, `"deep crater"`). When residents explain severity using alternative vocabulary (`"car bumper smashed due to 1 foot drop"` or `"someone could drown inside"`), the engine defaults to standard `MEDIUM` priority.

5. **Spatial Cluster Edge Cases in Duplicate Detection**:
   - The duplicate engine effectively captures spatial proximity combined with Jaccard token overlap. However, when two residents report the exact same defect using disjoint vocabularies (e.g. one in English and one in pure Tamil, or one mentioning `"transformer fire"` while the other writes `"power outage"`), text similarity drops below the threshold, leading to false negatives unless proximity is extremely close (<= 75m).
