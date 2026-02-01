// 300 words for pacing board exercises
// Organized by syllable count and sound categories
// Designed to practice speech rate control and articulation

import Hypher from 'hypher';
import english from 'hyphenation.en-us';

const hypher = new Hypher(english);

export const pacingWords = {
  // Two syllable words (80 words)
  twoSyllable: [
    // Common words
    "apple", "butter", "cookie", "dinner", "eagle", "flower", "garden", "happy", "island", "jacket",
    "kitten", "ladder", "mother", "number", "orange", "pencil", "rabbit", "shadow", "table", "window",
    // L/R sounds
    "yellow", "river", "roller", "ladder", "letter", "lemon", "ribbon", "ruler", "melon", "pillow",
    // TH sounds
    "weather", "feather", "mother", "father", "brother", "gather", "rather", "bother", "leather", "neither",
    // CH/SH sounds
    "chocolate", "chapter", "chicken", "catcher", "nature", "teacher", "pitcher", "kitchen", "shadow", "shelter",
    // Blends
    "blanket", "dragon", "frozen", "grapes", "broken", "spider", "pretty", "cricket", "trophy", "tricky",
    // Compound-like
    "sunset", "pancake", "baseball", "bedroom", "backyard", "rainbow", "footstep", "cupcake", "snowflake", "weekend"
  ],

  // Three syllable words (80 words)
  threeSyllable: [
    // Common words
    "adventure", "beautiful", "calendar", "dinosaur", "elephant", "favorite", "gigantic", "hospital", "important", "kangaroo",
    "library", "magazine", "newspaper", "opposite", "paragraph", "qualified", "recommend", "Saturday", "telephone", "umbrella",
    // Action words
    "remember", "celebrate", "consider", "decorate", "elevate", "generate", "hibernate", "imitate", "navigate", "operate",
    // Medical/therapy terms
    "therapy", "exercise", "medicine", "vitamin", "energy", "memory", "history", "mystery", "charity", "family",
    // S sounds
    "surprise", "somebody", "passenger", "messenger", "sunflower", "soccer", "syllable", "semester", "sensitive", "separate",
    // Complex sounds
    "delicious", "explosion", "musician", "attention", "direction", "instruction", "protection", "connection", "collection", "correction",
    // Nature/objects
    "butterfly", "strawberry", "cucumber", "tomato", "broccoli", "potato", "volcano", "tornado", "waterfall", "evergreen"
  ],

  // Four syllable words (50 words)
  fourSyllable: [
    // Common words
    "alligator", "calculator", "dictionary", "education", "fascinated", "generation", "horizontal", "imagination", "journalism", "kindergarten",
    "laboratory", "motorcycle", "negotiator", "opportunity", "particular", "qualification", "refrigerator", "satisfaction", "television", "understanding",
    // Action words
    "appreciate", "communicate", "demonstrate", "exaggerate", "facilitate", "investigate", "manipulate", "participate", "abbreviate", "accelerate",
    // Complex concepts
    "community", "difficulty", "electricity", "information", "personality", "possibility", "responsibility", "accessibility", "creativity", "probability",
    // Descriptive
    "comfortable", "enthusiastic", "independent", "unforgettable", "extraordinary", "unbelievable", "irresistible", "unavoidable", "unremarkable", "unacceptable"
  ],

  // Five+ syllable words (30 words)
  fiveOrMore: [
    // Complex words for advanced practice
    "organization", "communication", "pronunciation", "investigation", "experimentation", "congratulations", "rehabilitation", "discrimination", "recommendation", "administration",
    "characteristic", "environmental", "responsibility", "representative", "identification", "autobiography", "extraordinary", "individualized", "misunderstanding", "internationalized",
    "biodegradable", "unconditional", "uncontrollable", "unprecedented", "unanticipated", "incomprehensible", "overcompensation", "underestimating", "oversimplification", "microorganisms"
  ]
};

// Get all words as a flat array
export const getAllWords = () => {
  return [
    ...pacingWords.twoSyllable,
    ...pacingWords.threeSyllable,
    ...pacingWords.fourSyllable,
    ...pacingWords.fiveOrMore
  ];
};

// Get random words from a specific syllable count
export const getWordsBySyllables = (syllableCount) => {
  switch(syllableCount) {
    case 2: return pacingWords.twoSyllable;
    case 3: return pacingWords.threeSyllable;
    case 4: return pacingWords.fourSyllable;
    case 5: return pacingWords.fiveOrMore;
    default: return getAllWords();
  }
};

// Get a random selection of words
export const getRandomWords = (count = 10, syllableCount = null) => {
  const sourceWords = syllableCount ? getWordsBySyllables(syllableCount) : getAllWords();
  const shuffled = [...sourceWords].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

// Syllable helper - returns approximate syllable count for a word
export const countSyllables = (word) => {
  word = word.toLowerCase();
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  const match = word.match(/[aeiouy]{1,2}/g);
  return match ? match.length : 1;
};

// Approximate syllable breakdown for display
export const getPhoneticSyllables = (word) => {
  if (!word) return '';
  const cleaned = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!cleaned) return word;

  const syllables = hypher.hyphenate(cleaned);
  if (!syllables || syllables.length === 0) return word;

  return syllables.join('·');
};

export default pacingWords;
