/**
 * Prompt templates for AI-powered note generation.
 *
 * Each prompt instructs Gemini to return structured JSON so we can
 * store parsed data rather than raw text blobs.
 */

export const NOTE_TYPES = {
  summary: 'concise_summary',
  detailed: 'detailed_notes',
  bullets: 'bullet_revision',
  formula: 'formula_sheet',
  flowchart: 'flowchart',
  visual: 'visual_revision',
};

/**
 * Generate notes from a topic name.
 */
export function topicNotesPrompt(topic, noteType) {
  const typeInstructions = getNoteTypeInstruction(noteType);

  return `You are an expert study assistant. Generate ${typeInstructions} for the following topic.

Topic: "${topic}"

${getOutputFormat(noteType)}

Respond ONLY with valid JSON. No markdown, no explanation outside the JSON.`;
}

/**
 * Generate notes from pasted or uploaded text content.
 */
export function contentNotesPrompt(content, noteType) {
  const typeInstructions = getNoteTypeInstruction(noteType);

  return `You are an expert study assistant. Read the following content and generate ${typeInstructions}.

Content:
"""
${content}
"""

${getOutputFormat(noteType)}

Respond ONLY with valid JSON. No markdown, no explanation outside the JSON.`;
}

function getNoteTypeInstruction(noteType) {
  switch (noteType) {
    case NOTE_TYPES.summary:
      return 'a concise summary (3-5 key points, each 1-2 sentences)';
    case NOTE_TYPES.detailed:
      return 'detailed study notes with sections, explanations, and examples';
    case NOTE_TYPES.bullets:
      return 'bullet-point revision notes optimized for quick review';
    case NOTE_TYPES.formula:
      return 'a formula/key-terms sheet with all important formulas, definitions, and constants';
    case NOTE_TYPES.flowchart:
      return 'a Mermaid.js flowchart diagram showing the logical flow or concept relationships';
    case NOTE_TYPES.visual:
      return 'a visual revision structure with headings, sub-points, and memory aids';
    default:
      return 'concise study notes';
  }
}

function getOutputFormat(noteType) {
  if (noteType === NOTE_TYPES.flowchart) {
    return `Return JSON in this exact format:
{
  "title": "Flowchart: <topic>",
  "mermaidCode": "<valid Mermaid.js flowchart code using graph TD or flowchart TD syntax>",
  "summary": "<1-2 sentence description of what the flowchart shows>"
}

IMPORTANT: Inside the JSON, any double quotes or backslashes within the mermaidCode string must be properly escaped (e.g. use \\\" instead of \"). Do not include unescaped newlines in JSON strings; use \\n.
CRITICAL MERMAID RULES:
- Use simple alphanumeric IDs for nodes (e.g. A, B, C, step1, step2). Never use spaces or special characters in node IDs.
- Always wrap node labels in double quotes inside shape brackets, e.g. A["My Label Text"] or B("Step 2: Process"). Never use raw text without quotes.
- Connect nodes using valid arrows like --> or -->|Text| or -- Text -->. Never use -> or other invalid arrows.`;
  }

  if (noteType === NOTE_TYPES.formula) {
    return `Return JSON in this exact format:
{
  "title": "<topic> — Formula Sheet",
  "sections": [
    {
      "heading": "<section name>",
      "items": [
        { "label": "<formula or term name>", "value": "<formula or definition>" }
      ]
    }
  ]
}`;
  }

  return `Return JSON in this exact format:
{
  "title": "<descriptive title>",
  "sections": [
    {
      "heading": "<section heading>",
      "content": "<section content as a string — use \\n for line breaks if needed>"
    }
  ],
  "keyTakeaways": ["<takeaway 1>", "<takeaway 2>"]
}`;
}
