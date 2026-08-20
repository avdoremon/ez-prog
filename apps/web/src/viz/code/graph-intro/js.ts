export default `function describe(values, edges, directed) {
  const adj = values.map(() => []);      // @anchor INIT
  for (const { from, to } of edges) {
    adj[from].push(to);                  // @anchor NODE
    if (!directed) adj[to].push(from);
  }
  const degrees = adj.map((a) => a.length);
  return { adj, degrees };               // @anchor DONE
}`;
