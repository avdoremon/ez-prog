export default `function bfs(adj, start) {
  const seen = new Set([start]);         // @anchor INIT
  const queue = [start], order = [];
  while (queue.length > 0) {
    const node = queue.shift();          // @anchor DEQUEUE
    order.push(node);
    for (const next of adj[node]) {
      if (seen.has(next)) continue;      // @anchor SKIP
      seen.add(next);
      queue.push(next);                  // @anchor ENQUEUE
    }
  }
  return order;                          // @anchor DONE
}`;
