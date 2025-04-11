function cleanPGN(pgn) {
    return pgn
        .split('\n')
        .filter(line => !line.trim().startsWith('['))
        .join(' ')
        .replace(/\*/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

function removeParenthesesContent(pgn) {
    while (/\([^()]*\)/.test(pgn)) {
        pgn = pgn.replace(/\([^()]*\)/g, '');
    }
    return pgn.trim().replace(/\s+/g, ' ');
}

function extractMainLine(pgn) {
    const cleaned = removeParenthesesContent(pgn);
    return cleaned.replace(/\d+\.\.\.\s*/g, '');
}

function processMoves(text) {
    const regex = /\d\.\.\.|\d\./g;
    const positions = [];
    let match;

    while ((match = regex.exec(text)) !== null) {
        positions.push({ match: match[0], index: match.index });
    }

    const movesToRemove = [];
    const dotsToRemove = [];

    for (let i = 0; i < positions.length; i++) {
        const current = positions[i];
        if (current.match.endsWith('.')) {
            for (let j = i + 1; j < positions.length; j++) {
                const later = positions[j];
                if (later.match === current.match[0] + '...') {
                    const between = text.slice(current.index + current.match.length, later.index);
                    const moves = between.trim().split(/\s+/).filter(x => x);
                    if (moves.length > 1) {
                        const lastMove = moves[moves.length - 1];
                        const moveStart = between.lastIndexOf(lastMove);
                        const absPos = current.index + current.match.length + moveStart;
                        movesToRemove.push({ start: absPos, end: absPos + lastMove.length });
                    }
                    break;
                }
                if (later.match[0] !== current.match[0]) break;
            }
        }
    }

    for (let i = 0; i < positions.length; i++) {
        const current = positions[i];
        for (let j = i + 1; j < positions.length; j++) {
            const later = positions[j];
            if (later.match[0] !== current.match[0]) break;
            if (later.match === later.match[0] + "...") {
                dotsToRemove.push(later.index);
                break;
            }
        }
    }

    let result = '';
    for (let i = 0; i < text.length;) {
        const move = movesToRemove.find(r => i >= r.start && i < r.end);
        if (move) {
            i = move.end;
            continue;
        }
        if (dotsToRemove.includes(i)) {
            i += 4;
        } else {
            result += text[i++];
        }
    }

    return result;
}

function removeDuplicates(pgn) {
    const tokens = pgn.split(/(\d+\.(?:\.\.)?(?:\s+[^\d\s]+)*)/g).filter(Boolean);
    const seen = {};
    let result = [];
    let current = null;

    for (const token of tokens) {
        const match = token.match(/^(\d+)\.(\.\.)?/);
        if (match) {
            const key = match[1] + (match[2] ? 'b' : 'w');
            result = result.filter(item => item.key !== key);
            current = { key, text: token };
            seen[key] = true;
            result.push(current);
        } else if (current) {
            current.text += token;
        } else {
            result.push({ key: 'prefix', text: token });
        }
    }

    return result.map(item => item.text).join('').replace(/\s+/g, ' ').trim();
}

function extractVariation(pgn, index) {
    const stack = [];
    const variations = [];
    let prefix = '';

    for (let i = 0; i < pgn.length; i++) {
        if (pgn[i] === '(') {
            stack.push(i);
        } else if (pgn[i] === ')') {
            const start = stack.pop();
            if (variations.length === index) {
                prefix = pgn.slice(0, start);
            }
            variations.push(pgn.slice(start + 1, i));
        }
    }

    const cleanedPrefix = removeParenthesesContent(prefix).replace(/\(/g, '');
    const variation = removeParenthesesContent(variations[index] || '');
    const combined = normalizeSpaces(`${cleanedPrefix} ${variation}`);
    const deduplicated = removeDuplicates(combined);
    const processed = processMoves(deduplicated);

    return normalizeSpaces(processed) || null;
}

function normalizeSpaces(text) {
    return text.replace(/\s+/g, ' ');
}

function countOpenParentheses(text) {
    return [...text].filter(c => c === '(').length;
}

export function extractPGNLines(pgnText) {
    const lines = [];
    const totalVariations = countOpenParentheses(pgnText) - 1;

    const cleaned = cleanPGN(pgnText);
    const mainLine = extractMainLine(cleaned);
    lines.push(mainLine);

    for (let i = 0; i <= totalVariations; i++) {
        const variant = extractVariation(cleaned, i);
        lines.push(variant);
    }

    return lines;
}