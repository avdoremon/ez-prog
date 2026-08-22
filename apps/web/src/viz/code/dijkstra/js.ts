export default `function dijkstra(adj, start, n) {
  const dist = Array(n).fill(Infinity), settled = new Set();
  dist[start] = 0;                          // @anchor INIT
  for (;;) {
    let node = -1;                          // @anchor PICK
    for (let i = 0; i < n; i++) {
      if (settled.has(i)) continue;
      if (node < 0 || dist[i] < dist[node]) node = i;
    }
    if (node < 0 || dist[node] === Infinity) break;
    settled.add(node);
    for (const { to, weight } of adj[node]) {
      const via = dist[node] + weight;
      if (settled.has(to) || via >= dist[to]) continue;  // @anchor SKIP
      dist[to] = via;                       // @anchor IMPROVE
    }
  }
  return dist;                              // @anchor DONE
}`;
