'use strict';

/**
 * Clean/sanitize raw JSON strings to strip comments and clean commas/newlines.
 */
const sanitize = (str) => {
  return str
    // Strip block comments /* ... */
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Strip single-line comments // ... (excluding http:// or https://)
    .replace(/(^|[^\:\\])\/\/[^\r\n]*/g, '$1')
    // Strip python-style comments # ...
    .replace(/(^|[^"'\\])#[^\r\n]*/g, '$1')
    // Remove leading commas: { , "key" -> { "key"
    .replace(/(\{|\[)\s*,/g, '$1')
    // Remove trailing commas: "key": "val", } -> "key": "val" }
    .replace(/,\s*(\}|\])/g, '$1')
    // Escape unescaped newlines/tabs inside string literals
    .replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, (match) => {
      return match.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
    });
};

/**
 * Robustly parses a JSON string, recovering from truncation and minor syntax errors.
 * 
 * @param {string} rawText - The raw JSON string returned by the LLM.
 * @param {string} [errorContext='LLM output'] - Error context descriptor for custom messages.
 * @param {string} [logPrefix='JSONParser'] - Prefix for warning/error console logs.
 * @returns {object} The parsed JSON object.
 */
function parseJSON(rawText, errorContext = 'LLM output', logPrefix = 'JSONParser') {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error(`${errorContext} is empty or non-string`);
  }

  // Step 1: Strip markdown code blocks and surrounding whitespace
  let clean = rawText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

  // Direct parse attempt
  try {
    return JSON.parse(clean);
  } catch (_) {}

  // Step 2: Locate first JSON boundary ({ or [)
  const firstBrace = clean.indexOf('{');
  const firstBracket = clean.indexOf('[');

  let startIdx = -1;
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
  }

  if (startIdx !== -1) {
    clean = clean.slice(startIdx);
  }

  // Direct parse after slicing start
  try {
    return JSON.parse(clean);
  } catch (_) {}

  // Step 3: Strip comments and fix common syntax issues (leading/trailing commas)
  let sanitized = sanitize(clean);
  try {
    return JSON.parse(sanitized);
  } catch (_) {}

  // Step 4: Bracket-Matching Scanner to find exact end of root object/array
  let stack = [];
  let inString = false;
  let escaped = false;
  let rootEndedIndex = -1;

  for (let i = 0; i < sanitized.length; i++) {
    const char = sanitized[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
    } else {
      if (char === '"') {
        inString = true;
      } else if (char === '{' || char === '[') {
        stack.push(char === '{' ? '}' : ']');
      } else if (char === '}' || char === ']') {
        if (stack.length > 0 && stack[stack.length - 1] === char) {
          stack.pop();
          if (stack.length === 0) {
            rootEndedIndex = i;
            break; // Root object/array end found!
          }
        }
      }
    }
  }

  if (rootEndedIndex !== -1) {
    const exactJSON = sanitized.slice(0, rootEndedIndex + 1);
    try {
      return JSON.parse(exactJSON);
    } catch (_) {}

    try {
      const fn = new Function('return (' + exactJSON + ')');
      const obj = fn();
      if (obj && typeof obj === 'object') return obj;
    } catch (_) {}
  }

  // Step 5: Try JS Object Literal evaluation on sanitized string
  try {
    const fn = new Function('return (' + sanitized + ')');
    const obj = fn();
    if (obj && typeof obj === 'object') return obj;
  } catch (_) {}

  // Step 6: Truncation Repair via delimiter-based backward skip
  let currentStr = sanitized.trim();
  const maxCutback = Math.min(2000, currentStr.length);
  const minLength = currentStr.length - maxCutback;

  while (currentStr.length > minLength) {
    let repairStack = [];
    let repairInString = false;
    let repairEscaped = false;

    for (let i = 0; i < currentStr.length; i++) {
      const char = currentStr[i];
      if (repairInString) {
        if (repairEscaped) {
          repairEscaped = false;
        } else if (char === '\\') {
          repairEscaped = true;
        } else if (char === '"') {
          repairInString = false;
        }
      } else {
        if (char === '"') {
          repairInString = true;
        } else if (char === '{' || char === '[') {
          repairStack.push(char === '{' ? '}' : ']');
        } else if (char === '}' || char === ']') {
          if (repairStack.length > 0 && repairStack[repairStack.length - 1] === char) {
            repairStack.pop();
          }
        }
      }
    }

    let candidate = currentStr;
    if (repairInString) {
      candidate += '"';
    }
    candidate = candidate.trim().replace(/,\s*$/, '');
    
    let tempStack = [...repairStack];
    while (tempStack.length > 0) {
      candidate += tempStack.pop();
    }

    const finalCandidate = sanitize(candidate);
    try {
      const parsed = JSON.parse(finalCandidate);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    } catch (_) {}

    try {
      const fn = new Function('return (' + finalCandidate + ')');
      const obj = fn();
      if (obj && typeof obj === 'object') {
        return obj;
      }
    } catch (_) {}

    // Cut off backwards until the next structural JSON delimiter is reached
    let nextLen = currentStr.length - 1;
    while (nextLen > minLength) {
      const char = currentStr[nextLen - 1];
      if ('[,:{}[\]"\\]'.includes(char)) {
        break;
      }
      nextLen--;
    }
    currentStr = currentStr.slice(0, nextLen).trim();
  }

  console.error(`[${logPrefix}] JSON repair failed: LLM output could not be parsed into valid JSON.`);
  throw new Error(`${errorContext} could not be parsed into valid JSON: Unexpected token/syntax error near the truncation point.`);
}

module.exports = { parseJSON };
