/**
 * RTL (Right-to-Left) Language Detection and Utilities
 * Supports Persian, Arabic, Hebrew, Urdu, and other RTL languages
 */

// RTL Unicode ranges
const RTL_RANGES = [
  // Arabic (including Arabic Supplement, Arabic Extended-A, Arabic Presentation Forms-A/B)
  [0x0600, 0x06FF], // Arabic
  [0x0750, 0x077F], // Arabic Supplement
  [0x08A0, 0x08FF], // Arabic Extended-A
  [0xFB50, 0xFDFF], // Arabic Presentation Forms-A
  [0xFE70, 0xFEFF], // Arabic Presentation Forms-B
  
  // Hebrew
  [0x0590, 0x05FF], // Hebrew
  [0xFB1D, 0xFB4F], // Hebrew Presentation Forms
  
  // Other RTL scripts
  [0x07C0, 0x07FF], // N'Ko
  [0x0800, 0x083F], // Samaritan
  [0x0840, 0x085F], // Mandaic
  [0x08A0, 0x08FF], // Arabic Extended-A
  [0x10800, 0x1083F], // Cypriot Syllabary
  [0x10840, 0x1085F], // Imperial Aramaic
  [0x10860, 0x1087F], // Palmyrene
  [0x10880, 0x108AF], // Nabataean
  [0x108E0, 0x108FF], // Hatran
  [0x10900, 0x1091F], // Phoenician
  [0x10920, 0x1093F], // Lydian
  [0x10980, 0x1099F], // Meroitic Hieroglyphs
  [0x109A0, 0x109FF], // Meroitic Cursive
  [0x10A00, 0x10A5F], // Kharoshthi
  [0x10A60, 0x10A7F], // Old South Arabian
  [0x10A80, 0x10A9F], // Old North Arabian
  [0x10AC0, 0x10AFF], // Manichaean
  [0x10B00, 0x10B3F], // Avestan
  [0x10B40, 0x10B5F], // Inscriptional Parthian
  [0x10B60, 0x10B7F], // Inscriptional Pahlavi
  [0x10B80, 0x10BAF], // Psalter Pahlavi
  [0x10C00, 0x10C4F], // Old Turkic
  [0x10E60, 0x10E7F], // Rumi Numeral Symbols
  [0x1E800, 0x1E8DF], // Mende Kikakui
  [0x1E900, 0x1E95F], // Adlam
];

// Common RTL language patterns
const RTL_LANGUAGE_PATTERNS = {
  persian: /[\u0600-\u06FF\u0750-\u077F]/,
  arabic: /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/,
  hebrew: /[\u0590-\u05FF\uFB1D-\uFB4F]/,
  urdu: /[\u0600-\u06FF\u0750-\u077F]/,
};

/**
 * Check if a character is RTL
 */
function isRTLCharacter(char: string): boolean {
  const code = char.codePointAt(0);
  if (!code) return false;
  
  return RTL_RANGES.some(([start, end]) => code >= start && code <= end);
}

/**
 * Detect if text contains RTL characters
 */
export function hasRTLCharacters(text: string): boolean {
  if (!text) return false;
  
  for (const char of text) {
    if (isRTLCharacter(char)) {
      return true;
    }
  }
  return false;
}

/**
 * Calculate RTL ratio in text
 */
export function getRTLRatio(text: string): number {
  if (!text) return 0;
  
  let rtlCount = 0;
  let totalCount = 0;
  
  for (const char of text) {
    // Only count letters and digits, ignore spaces and punctuation
    if (/\p{L}|\p{N}/u.test(char)) {
      totalCount++;
      if (isRTLCharacter(char)) {
        rtlCount++;
      }
    }
  }
  
  return totalCount > 0 ? rtlCount / totalCount : 0;
}

/**
 * Determine text direction based on content
 */
export function getTextDirection(text: string, threshold: number = 0.3): 'ltr' | 'rtl' {
  const rtlRatio = getRTLRatio(text);
  return rtlRatio >= threshold ? 'rtl' : 'ltr';
}

/**
 * Detect specific RTL language
 */
export function detectRTLLanguage(text: string): string | null {
  if (!text) return null;
  
  for (const [language, pattern] of Object.entries(RTL_LANGUAGE_PATTERNS)) {
    if (pattern.test(text)) {
      return language;
    }
  }
  
  return hasRTLCharacters(text) ? 'rtl' : null;
}

/**
 * Get appropriate font family for RTL languages
 */
export function getRTLFontFamily(language: string | null): string {
  switch (language) {
    case 'persian':
      return '"Vazirmatn", "Tahoma", "Arial Unicode MS", sans-serif';
    case 'arabic':
      return '"Noto Sans Arabic", "Tahoma", "Arial Unicode MS", sans-serif';
    case 'hebrew':
      return '"Noto Sans Hebrew", "Arial Hebrew", "Arial Unicode MS", sans-serif';
    case 'urdu':
      return '"Noto Nastaliq Urdu", "Tahoma", "Arial Unicode MS", sans-serif';
    default:
      return '"Arial Unicode MS", sans-serif';
  }
}

/**
 * Main hook for RTL text detection and styling
 */
export function useRTLText(text: string) {
  const hasRTL = hasRTLCharacters(text);
  const direction = getTextDirection(text);
  const language = detectRTLLanguage(text);
  const rtlRatio = getRTLRatio(text);
  
  const fontFamily = hasRTL ? getRTLFontFamily(language) : undefined;
  
  const classes = hasRTL ? 'rtl-text' : 'ltr-text';
  
  return {
    hasRTL,
    direction,
    language,
    rtlRatio,
    fontFamily,
    classes,
    isRTL: direction === 'rtl',
    isLTR: direction === 'ltr',
  };
}

/**
 * Get CSS styles for RTL text (pure utility function)
 */
export function getRTLStyles(text: string) {
  const hasRTL = hasRTLCharacters(text);
  const direction = getTextDirection(text);
  const language = detectRTLLanguage(text);
  const fontFamily = hasRTL ? getRTLFontFamily(language) : undefined;
  
  return {
    direction,
    fontFamily: hasRTL ? fontFamily : undefined,
    textAlign: direction === 'rtl' ? 'right' : 'left',
    unicodeBidi: hasRTL ? 'embed' : undefined,
  } as React.CSSProperties;
} 