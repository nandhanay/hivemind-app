/**
 * Extract a full plain text representation of a note,
 * handling regular content, structured sections, and list items (e.g. formula sheets).
 *
 * @param {object} note - The note object to parse
 * @returns {string} The full plain text content of the note
 */
function formatSectionContent(content) {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map((item) => {
      if (typeof item === 'string') return item;
      if (typeof item === 'object' && item !== null) {
        return Object.entries(item).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join('\n');
      }
      return String(item);
    }).join('\n\n');
  }
  if (typeof content === 'object') {
    return Object.entries(content).map(([k, v]) => {
      const valStr = typeof v === 'object' ? JSON.stringify(v) : String(v);
      return `• ${k}:\n${valStr}`;
    }).join('\n\n');
  }
  return String(content);
}

function formatSectionItems(items) {
  if (!items || !Array.isArray(items)) return '';
  return items.map((item) => {
    if (!item) return '';
    if (typeof item === 'string') return item;
    if (typeof item === 'object') {
      const label = item.label || '';
      const val = typeof item.value === 'object' && item.value !== null
        ? JSON.stringify(item.value)
        : (item.value || '');
      return `${label}: ${val}`;
    }
    return String(item);
  }).join('\n');
}

export function getNoteContentString(note) {
  if (!note) return '';
  if (note.content && (!note.sections || note.sections.length === 0)) {
    return note.content;
  }
  if (note.sections && note.sections.length > 0) {
    return note.sections
      .map((sec) => {
        const secText =
          formatSectionContent(sec.content) ||
          formatSectionItems(sec.items) ||
          '';
        return `## ${sec.heading}\n${secText}`;
      })
      .join('\n\n');
  }
  return note.content || '';
}
