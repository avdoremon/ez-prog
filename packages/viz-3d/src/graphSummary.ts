/**
 * The idle-state scene-summary text for a graph -- the graph-shaped
 * equivalent of TreeView3D's buildSceneSummary. Deliberately does not
 * report "levels"/"depth" the way the tree summary does: neither concept
 * is well-defined for a graph with cycles.
 */
export function buildGraphSummary(
  nodeCount: number,
  edgeCount: number,
  directed: boolean,
): string {
  if (nodeCount === 0) return 'Empty graph.';
  const nodeWord = nodeCount === 1 ? 'node' : 'nodes';
  const edgeWord = edgeCount === 1 ? 'edge' : 'edges';
  const edgeDesc = directed ? `directed ${edgeWord}` : edgeWord;
  return `Graph, ${nodeCount} ${nodeWord}, ${edgeCount} ${edgeDesc}.`;
}
