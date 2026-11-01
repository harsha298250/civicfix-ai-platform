/**
 * Client-Side Multilingual Civic Triage & Keyword Assistant
 * Provides instant category suggestion from bilingual text (English & Tamil)
 * and Web Speech API language configuration.
 * 
 * Note: Tamil lexicon translations require review by a native Tamil speaker.
 */

export const CATEGORY_LEXICON = [
  {
    id: 'roads',
    keywords: [
      'pothole', 'road', 'asphalt', 'tar', 'crater', 'fissure', 'pavement', 'curb', 'divider',
      'speed breaker', 'speedbreaker', 'footpath', 'sidewalk',
      'குழி', 'சாலை', 'தார் சாலை', 'பள்ளம்', 'சாலை சேதம்', 'நடைபாதை', 'வேகத்தடை', 'ரோடு', 'மேடு பள்ளம்'
    ]
  },
  {
    id: 'water',
    keywords: [
      'water', 'pipeline', 'pipe burst', 'pipe leak', 'water leak', 'leakage', 'drinking water',
      'contamination', 'sewage', 'sewer', 'flange', 'borewell', 'water main', 'drainage', 'drain',
      'clogged', 'stagnant', 'flood',
      'குடிநீர்', 'தண்ணீர் கசிவு', 'குழாய் உடைப்பு', 'தண்ணீர் குழாய்', 'கழிவுநீர்', 'சாக்கடை',
      'தண்ணீர் விநியோகம்', 'நீர்க்கசிவு', 'குழாய்', 'தண்ணீர்',
      'வடிகால்', 'மழைநீர் வடிகால்', 'மழைநீர்', 'கால்வாய்', 'அடைப்பு', 'வெள்ளம்', 'நீர் தேக்கம்', 'தேங்கிய நீர்'
    ]
  },
  {
    id: 'lighting',
    keywords: [
      'street light', 'streetlight', 'lamppost', 'lamp post', 'light pole', 'bulb', 'dark street',
      'transformer', 'cable', 'wire', 'illumination', 'blackout',
      'தெருவிளக்கு', 'தெரு விளக்கு', 'விளக்கு கம்பம்', 'மின்விளக்கு', 'விளக்கு எரியவில்லை',
      'இருட்டாக உள்ளது', 'மின் கம்பி', 'மின்மாற்றி', 'விளக்கு'
    ]
  },
  {
    id: 'waste',
    keywords: [
      'garbage', 'waste', 'trash', 'dump', 'dumping', 'debris', 'litter', 'dustbin', 'bin',
      'stench', 'foul smell', 'plastic waste', 'compost',
      'குப்பை', 'குப்பைக் கூளம்', 'கழிவு', 'குப்பை தொட்டி', 'துர்நாற்றம்',
      'குப்பை அள்ளப்படவில்லை', 'பிளாஸ்டிக் கழிவு', 'அழுக்கு'
    ]
  },
  {
    id: 'traffic',
    keywords: [
      'bus stop', 'bus shelter', 'bus bay', 'transit', 'depot', 'traffic', 'signal', 'metro station',
      'பேருந்து நிறுத்தம்', 'பேருந்து நிழற்குடை', 'பேருந்து', 'அரசு பேருந்து', 'மெட்ரோ நிலையம்', 'பஸ் ஸ்டாப்', 'போக்குவரத்து'
    ]
  },
  {
    id: 'parks',
    keywords: [
      'tree', 'branch', 'fallen tree', 'park', 'playground', 'garden', 'horticulture', 'lawn',
      'மரம்', 'விழுந்த மரம்', 'மரக்கிளை', 'கிளை முறிந்தது', 'பூங்கா', 'தோட்டம்', 'புல்வெளி'
    ]
  }
];

/**
 * Suggests the best defect category given user-entered title and narrative.
 * Evaluates both English and Tamil keywords.
 * Returns category id string or null if no confident keyword match.
 */
export function suggestCategoryFromText(text) {
  if (!text || typeof text !== 'string') return null;
  const lower = text.toLowerCase();

  let bestCat = null;
  let maxMatches = 0;

  for (const cat of CATEGORY_LEXICON) {
    let matchCount = 0;
    for (const kw of cat.keywords) {
      if (lower.includes(kw.toLowerCase())) {
        matchCount += kw.includes(' ') ? 3 : 2;
      }
    }
    if (matchCount > maxMatches) {
      maxMatches = matchCount;
      bestCat = cat.id;
    }
  }

  return maxMatches > 0 ? bestCat : null;
}

/**
 * Checks if the Web Speech API is supported in the current environment
 */
export function isSpeechRecognitionSupported() {
  if (typeof window === 'undefined') return false;
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/**
 * Gets the BCP 47 language tag for Speech Recognition
 */
export function getSpeechLanguage(currentLang) {
  return currentLang === 'ta' ? 'ta-IN' : 'en-IN';
}
