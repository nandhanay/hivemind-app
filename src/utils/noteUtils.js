/**
 * Extract a full plain text representation of a note,
 * handling regular content, structured sections, and list items (e.g. formula sheets).
 *
 * @param {object} note - The note object to parse
 * @returns {string} The full plain text content of the note
 */
export function getNoteContentString(note) {
  if (!note) return '';
  if (note.content && (!note.sections || note.sections.length === 0)) {
    return note.content;
  }
  if (note.sections && note.sections.length > 0) {
    return note.sections
      .map((sec) => {
        const secText =
          sec.content ||
          sec.items?.map((item) => `${item.label}: ${item.value}`).join('\n') ||
          '';
        return `## ${sec.heading}\n${secText}`;
      })
      .join('\n\n');
  }
  return note.content || '';
}
