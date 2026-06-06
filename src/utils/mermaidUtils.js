/**
 * Sanitizes and cleans generated Mermaid flowchart code to ensure it complies with Mermaid syntax.
 * Prevents common parsing issues like unescaped quotes, colons, spaces, and invalid arrows.
 */
export function sanitizeMermaidCode(code) {
  if (!code) return '';

  let sanitized = code.trim();

  // Strip markdown code fences if present
  if (sanitized.startsWith('```mermaid')) {
    sanitized = sanitized.slice(10);
  } else if (sanitized.startsWith('```')) {
    sanitized = sanitized.slice(3);
  }
  if (sanitized.endsWith('```')) {
    sanitized = sanitized.slice(0, -3);
  }
  sanitized = sanitized.trim();

  const lines = sanitized.split('\n');
  const processedLines = [];
  const definedNodes = new Set();
  let hasHeader = false;

  // Identify the header
  let headerIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (line.startsWith('%%')) {
      processedLines.push(line);
      continue;
    }
    if (/^(graph|flowchart)\b/i.test(line)) {
      headerIndex = i;
      hasHeader = true;
      let header = line;
      // Normalize graph/flowchart to have TD if no direction is specified
      if (!/\b(TD|LR|BT|RL|TB)\b/i.test(header)) {
        header = header + ' TD';
      }
      processedLines.push(header);
      break;
    }
  }

  if (!hasHeader) {
    processedLines.push('graph TD');
  }

  // Helper to parse node details
  const parseNodePart = (part) => {
    part = part.trim();
    if (!part) return null;

    // Find first opening brace/bracket
    const firstOpenIdx = part.search(/[\[\({]/);
    if (firstOpenIdx === -1) {
      // No label container, the whole part is the ID
      return { id: part, label: part, open: '[', close: ']' };
    }

    const id = part.substring(0, firstOpenIdx).trim();
    const rest = part.substring(firstOpenIdx).trim();

    let open = '[';
    let close = ']';
    let label = rest;

    if (rest.startsWith('([') && rest.endsWith('])')) {
      open = '(['; close = '])';
      label = rest.slice(2, -2);
    } else if (rest.startsWith('[[') && rest.endsWith(']]')) {
      open = '[['; close = ']]';
      label = rest.slice(2, -2);
    } else if (rest.startsWith('((') && rest.endsWith('))')) {
      open = '(('; close = '))';
      label = rest.slice(2, -2);
    } else if (rest.startsWith('[') && rest.endsWith(']')) {
      open = '['; close = ']';
      label = rest.slice(1, -1);
    } else if (rest.startsWith('(') && rest.endsWith(')')) {
      open = '('; close = ')';
      label = rest.slice(1, -1);
    } else if (rest.startsWith('{') && rest.endsWith('}')) {
      open = '{'; close = '}';
      label = rest.slice(1, -1);
    }

    label = label.trim();
    if (label.startsWith('"') && label.endsWith('"')) {
      label = label.slice(1, -1);
    }

    return { id, label, open, close };
  };

  // Process lines after the header
  const startIdx = hasHeader ? headerIndex + 1 : 0;
  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (line.startsWith('%%')) {
      processedLines.push(line);
      continue;
    }
    const isSpecialLine = /^\s*(subgraph|end|style|classDef|class|click|linkStyle)\b/i.test(line);
    if (isSpecialLine) {
      processedLines.push(line);
      continue;
    }

    // Process nodes and connections
    const arrowRegex = /(\s*(?:--\s*[^-]+\s*-->|==\s*[^=]+\s*==>|-\.\s*[^.]+\s*\.->|-[.-]*>|={2,}>|-{2,}|->|-->)\s*(?:\|[^|]+\|)?)/g;
    const parts = line.split(arrowRegex);

    const processedParts = parts.map((part, idx) => {
      if (idx % 2 === 1) {
        // Arrow separator
        let arrow = part.trim();
        if (arrow.startsWith('->')) {
          arrow = arrow.replace('->', '-->');
        }
        return ` ${arrow} `;
      } else {
        // Node
        const parsed = parseNodePart(part);
        if (!parsed) return '';
        const { id, label, open, close } = parsed;
        const safeId = id.replace(/[^a-zA-Z0-9_]/g, '_');
        if (!safeId) return '';

        if (definedNodes.has(safeId)) {
          return safeId;
        } else {
          definedNodes.add(safeId);
          const escapedLabel = label.replace(/"/g, '\\"');
          return `${safeId}${open}"${escapedLabel}"${close}`;
        }
      }
    });

    processedLines.push(processedParts.filter(Boolean).join(''));
  }

  return processedLines.filter(Boolean).join('\n');
}

/**
 * Parses a Mermaid graph code string into a human-readable list of step transitions
 * to act as a fallback in case rendering fails.
 */
export function parseMermaidToText(code) {
  if (!code) return [];
  
  const steps = [];
  const nodeLabels = {};
  const lines = code.split('\n');

  // Helper to parse node details
  const parseNodePart = (part) => {
    part = part.trim();
    if (!part) return null;

    const firstOpenIdx = part.search(/[\[\({]/);
    if (firstOpenIdx === -1) {
      return { id: part, label: part };
    }

    const id = part.substring(0, firstOpenIdx).trim();
    const rest = part.substring(firstOpenIdx).trim();

    let label = rest;
    if (rest.startsWith('([') && rest.endsWith('])')) {
      label = rest.slice(2, -2);
    } else if (rest.startsWith('[[') && rest.endsWith(']]')) {
      label = rest.slice(2, -2);
    } else if (rest.startsWith('((') && rest.endsWith('))')) {
      label = rest.slice(2, -2);
    } else if (rest.startsWith('[') && rest.endsWith(']')) {
      label = rest.slice(1, -1);
    } else if (rest.startsWith('(') && rest.endsWith(')')) {
      label = rest.slice(1, -1);
    } else if (rest.startsWith('{') && rest.endsWith('}')) {
      label = rest.slice(1, -1);
    }

    label = label.trim();
    if (label.startsWith('"') && label.endsWith('"')) {
      label = label.slice(1, -1);
    }

    return { id, label };
  };

  // 1st Pass: Extract all defined node labels
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('%%') || /^(graph|flowchart|subgraph|end)\b/i.test(trimmed)) {
      continue;
    }

    const arrowRegex = /(\s*(?:--\s*[^-]+\s*-->|==\s*[^=]+\s*==>|-\.\s*[^.]+\s*\.->|-[.-]*>|={2,}>|-{2,}|->|-->)\s*(?:\|[^|]+\|)?)/g;
    const parts = trimmed.split(arrowRegex);

    for (let i = 0; i < parts.length; i += 2) {
      const part = parts[i].trim();
      if (!part) continue;

      const parsed = parseNodePart(part);
      if (parsed) {
        const safeId = parsed.id.replace(/[^a-zA-Z0-9_]/g, '_');
        if (safeId && parsed.label) {
          nodeLabels[safeId] = parsed.label;
        }
      }
    }
  }

  // 2nd Pass: Extract connections
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('%%') || /^(graph|flowchart|subgraph|end)\b/i.test(trimmed)) {
      continue;
    }

    const arrowRegex = /(\s*(?:--\s*[^-]+\s*-->|==\s*[^=]+\s*==>|-\.\s*[^.]+\s*\.->|-[.-]*>|={2,}>|-{2,}|->|-->)\s*(?:\|[^|]+\|)?)/g;
    const parts = trimmed.split(arrowRegex);

    for (let i = 0; i < parts.length - 2; i += 2) {
      const fromPart = parts[i].trim();
      const arrowPart = parts[i + 1].trim();
      const toPart = parts[i + 2].trim();

      const fromParsed = parseNodePart(fromPart);
      const toParsed = parseNodePart(toPart);

      if (fromParsed && toParsed) {
        const fromId = fromParsed.id.replace(/[^a-zA-Z0-9_]/g, '_');
        const toId = toParsed.id.replace(/[^a-zA-Z0-9_]/g, '_');

        const fromLabel = nodeLabels[fromId] || fromParsed.label || fromId;
        const toLabel = nodeLabels[toId] || toParsed.label || toId;

        let arrowText = '';
        const pipeMatch = arrowPart.match(/\|([^|]+)\|/);
        if (pipeMatch) {
          arrowText = ` (${pipeMatch[1].trim()})`;
        } else {
          const textMatch = arrowPart.match(/--(.*?)-->|==(.*?)[==>|=>]|-\.(.*?)\.-/);
          const rawText = textMatch ? (textMatch[1] || textMatch[2] || textMatch[3] || '').trim() : '';
          if (rawText && rawText !== '>') {
            arrowText = ` (${rawText})`;
          }
        }

        steps.push(`${fromLabel}${arrowText} ➔ ${toLabel}`);
      }
    }
  }

  return steps;
}
