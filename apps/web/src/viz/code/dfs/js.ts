export default `function dfs(adj, start) {
  const seen = new Set([start]);         // @anchor INIT
  const stack = [start], order = [];
  while (stack.length > 0) {
    const node = stack.pop();            // @anchor POP
    order.push(node);
    for (const next of adj[node]) {
      if (seen.has(next)) continue;      // @anchor SKIP
      seen.add(next);
      stack.push(next);                  // @anchor PUSH
    }
  }
  return order;                          // @anchor DONE
}`;
