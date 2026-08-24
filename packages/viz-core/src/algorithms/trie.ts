import { snap } from '../snap.js';
import type { Frame, GraphState, Mark, VizAlgorithm } from '../types.js';

export interface TrieInput {
  words: string[];
  search: string;
}

/**
 * Builds a trie by inserting each word one character at a time from the
 * root, then searches for one string. Reuses GraphView with a `GraphState`
 * whose `values` are single-character labels rather than numbers (the
 * feature that widening exists for) — nodes are still identified by index,
 * and edges are still directed parent-to-child, exactly like every other
 * GraphView lesson.
 *
 * A shared prefix reuses the node an earlier word already created there;
 * only a character with no existing edge creates a new one. That reuse is
 * the entire reason a trie is smaller than storing every word separately.
 */
export const trie: VizAlgorithm<TrieInput, GraphState> =
function* ({ words, search }): Generator<Frame<GraphState>> {
  const values: (number | string)[] = ['•'];
  const edges: { from: number; to: number }[] = [];
  const children: Map<string, number>[] = [new Map()];
  const isWord = new Set<number>();

  const state = (): GraphState => ({
    values: [...values], edges: edges.map((e) => ({ ...e })), directed: true,
  });
  const wordMarks = (): Mark[] =>
    [...isWord].map((i) => ({ kind: 'done' as const, at: { t: 'index' as const, i } }));

  yield {
    state: snap(state()), line: 'INIT', vars: { nodes: 1 },
    note: `An empty trie: just a root node, representing "no characters chosen yet."`,
  };

  for (const word of words) {
    let current = 0;
    for (let ci = 0; ci < word.length; ci++) {
      const ch = word[ci]!;
      const isLast = ci === word.length - 1;
      let child = children[current]!.get(ch);
      const created = child === undefined;

      if (created) {
        values.push(ch);
        child = values.length - 1;
        edges.push({ from: current, to: child });
        children.push(new Map());
        children[current]!.set(ch, child);
      }

      if (isLast) isWord.add(child!);

      yield {
        state: snap(state()), line: 'STEP', vars: { char: ch, word },
        marks: [
          ...wordMarks(),
          { kind: created ? 'active' : 'visited', at: { t: 'index', i: child! } },
          { kind: 'active', at: { t: 'edge', from: current, to: child! } },
        ],
        note: created
          ? `No edge for '${ch}' from here yet — create a new node.`
          : `An edge for '${ch}' already exists — reuse it, no new node needed.`,
      };

      current = child!;
    }
  }

  let current = 0;
  let missingAt = -1;
  let missingChar = '';

  for (let ci = 0; ci < search.length; ci++) {
    const ch = search[ci]!;
    const child = children[current]!.get(ch);

    if (child === undefined) {
      missingAt = current;
      missingChar = ch;
      yield {
        state: snap(state()), line: 'SEARCH', vars: { char: ch },
        marks: [...wordMarks(), { kind: 'discard', at: { t: 'index', i: current } }],
        note: `No edge for '${ch}' from here — '${search}' is not in the trie.`,
      };
      break;
    }

    yield {
      state: snap(state()), line: 'SEARCH', vars: { char: ch },
      marks: [
        ...wordMarks(),
        { kind: 'cursor', at: { t: 'index', i: child } },
        { kind: 'active', at: { t: 'edge', from: current, to: child } },
      ],
      note: `Follow the edge for '${ch}'.`,
    };
    current = child;
  }

  if (missingAt !== -1) {
    yield {
      state: snap(state()), line: 'DONE',
      marks: [...wordMarks(), { kind: 'discard', at: { t: 'index', i: missingAt } }],
      note: `'${search}' is not in the trie — no edge for '${missingChar}' along the way.`,
    };
  } else if (isWord.has(current)) {
    yield {
      state: snap(state()), line: 'DONE',
      marks: [...wordMarks(), { kind: 'done', at: { t: 'index', i: current } }],
      note: `Found '${search}' — every character had an edge, and this node is marked as a complete word.`,
    };
  } else {
    yield {
      state: snap(state()), line: 'DONE',
      marks: [...wordMarks(), { kind: 'compare', at: { t: 'index', i: current } }],
      note: `'${search}' is a real path in the trie, but it was never inserted as its own word — only a prefix of something longer.`,
    };
  }
};
