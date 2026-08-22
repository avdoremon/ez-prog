export default `int dijkstra(const Graph *g, int start, int n, int *dist) {
    bool settled[MAX] = { false };
    for (int i = 0; i < n; i++) dist[i] = INT_MAX;
    dist[start] = 0;                        // @anchor INIT
    for (;;) {
        int node = -1;                      // @anchor PICK
        for (int i = 0; i < n; i++) {
            if (settled[i]) continue;
            if (node < 0 || dist[i] < dist[node]) node = i;
        }
        if (node < 0 || dist[node] == INT_MAX) break;
        settled[node] = true;
        for (int k = 0; k < g->degree[node]; k++) {
            int to = g->adj[node][k], w = g->weight[node][k];
            long via = (long)dist[node] + w;
            if (settled[to] || via >= dist[to]) continue;  // @anchor SKIP
            dist[to] = (int)via;            // @anchor IMPROVE
        }
    }
    int reached = 0;
    for (int i = 0; i < n; i++) if (dist[i] != INT_MAX) reached++;
    return reached;                         // @anchor DONE
}`;
