/**
 * Practical 13: AI Service Module
 * Handles OpenAI & Gemini API calls with robust error handling,
 * responsible rate-limiting, and graceful degradation fallback.
 */

// Simple in-memory rate limiter: tracks last request timestamp per identifier (User ID or IP)
const rateLimits = new Map();
const COOLDOWN_SECONDS = 15; // Max 1 request every 15 seconds per user

function checkRateLimit(identifier) {
  const now = Date.now();
  const lastRequest = rateLimits.get(identifier);

  if (lastRequest && (now - lastRequest) < COOLDOWN_SECONDS * 1000) {
    const retryAfter = Math.ceil((COOLDOWN_SECONDS * 1000 - (now - lastRequest)) / 1000);
    return { allowed: false, retryAfter };
  }

  rateLimits.set(identifier, now);
  return { allowed: true };
}

// Rule-based fallback generator for graceful degradation when API is unreachable or key is missing
function generateRuleBasedFallback(title) {
  const cleanTitle = (title || 'Task').trim();
  const lower = cleanTitle.toLowerCase();

  if (lower.includes('bug') || lower.includes('fix') || lower.includes('error')) {
    return `Investigate root cause, reproduce the issue, apply fix, and verify with automated regression tests for "${cleanTitle}".`;
  }
  if (lower.includes('deploy') || lower.includes('release') || lower.includes('ci/cd')) {
    return `Review deployment checklist, verify pipeline pass status, and validate production readiness for "${cleanTitle}".`;
  }
  if (lower.includes('test') || lower.includes('coverage')) {
    return `Write unit and integration test suites, cover edge cases, and verify pass status for "${cleanTitle}".`;
  }
  if (lower.includes('doc') || lower.includes('readme') || lower.includes('guide')) {
    return `Draft clear technical documentation, code snippets, and usage instructions for "${cleanTitle}".`;
  }
  return `Plan requirements, organize necessary resources, implement steps, and verify completion for "${cleanTitle}".`;
}

// Heuristic priority suggestion based on task title keywords
function inferPriority(title) {
  const lower = (title || '').toLowerCase();
  if (lower.includes('urgent') || lower.includes('critical') || lower.includes('bug') || lower.includes('fix') || lower.includes('error')) {
    return 'high';
  }
  if (lower.includes('review') || lower.includes('feature') || lower.includes('test') || lower.includes('update')) {
    return 'medium';
  }
  return 'low';
}

/**
 * Generates task description and priority suggestion.
 * Attempts OpenAI or Gemini if keys are present; gracefully falls back otherwise.
 */
async function generateTaskDescription(title) {
  if (!title || !title.trim()) {
    return {
      description: '',
      priority: 'medium',
      fallback: true,
      message: 'Title is required to generate description.'
    };
  }

  const prompt = `You are a productivity assistant for a task management system.
Write a clear, concise (1-2 sentences) actionable description and suggest a priority (low, medium, or high) for this task: "${title.trim()}".
Return your response in JSON format with exactly two keys: "description" (string) and "priority" (string: low, medium, or high).`;

  // 1. Try OpenAI API if valid OPENAI_API_KEY is configured
  const openAiKey = (process.env.OPENAI_API_KEY || '').trim();
  const isValidOpenAiKey = openAiKey && openAiKey !== 'your_openai_api_key_here' && openAiKey.startsWith('sk-');
  if (isValidOpenAiKey) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openAiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 150
        }),
        signal: AbortSignal.timeout(8000) // 8 second timeout
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        if (content) {
          try {
            // Remove markdown code block if present
            const cleanJson = content.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleanJson);
            return {
              description: parsed.description || content,
              priority: ['low', 'medium', 'high'].includes(parsed.priority?.toLowerCase()) ? parsed.priority.toLowerCase() : inferPriority(title),
              fallback: false,
              source: 'openai',
              aiGenerated: true
            };
          } catch {
            return {
              description: content,
              priority: inferPriority(title),
              fallback: false,
              source: 'openai',
              aiGenerated: true
            };
          }
        }
      } else {
        console.warn(`[AI Service] OpenAI returned status ${response.status}. Falling back gracefully.`);
      }
    } catch (err) {
      console.warn(`[AI Service] OpenAI call failed (${err.message}). Using fallback.`);
    }
  }

  // 2. Try Google Gemini API if valid GEMINI_API_KEY is configured
  const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
  const isValidGeminiKey = geminiKey && geminiKey !== 'your_gemini_api_key_here' && geminiKey.length > 20;
  if (isValidGeminiKey) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 150, temperature: 0.7 }
        }),
        signal: AbortSignal.timeout(8000)
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) {
          try {
            const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleanJson);
            return {
              description: parsed.description || text,
              priority: ['low', 'medium', 'high'].includes(parsed.priority?.toLowerCase()) ? parsed.priority.toLowerCase() : inferPriority(title),
              fallback: false,
              source: 'gemini',
              aiGenerated: true
            };
          } catch {
            return {
              description: text,
              priority: inferPriority(title),
              fallback: false,
              source: 'gemini',
              aiGenerated: true
            };
          }
        }
      } else {
        console.warn(`[AI Service] Gemini returned status ${response.status}. Falling back gracefully.`);
      }
    } catch (err) {
      console.warn(`[AI Service] Gemini call failed (${err.message}). Using fallback.`);
    }
  }

  // 3. Graceful degradation fallback (Zero Crash Guarantee)
  return {
    description: generateRuleBasedFallback(title),
    priority: inferPriority(title),
    fallback: true,
    source: 'fallback',
    aiGenerated: false,
    message: 'AI API key not configured or service unreachable. Generated via smart fallback.'
  };
}

module.exports = {
  generateTaskDescription,
  checkRateLimit
};
