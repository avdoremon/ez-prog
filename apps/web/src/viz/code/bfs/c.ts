export default `int bfs(const Graph *g, int start, int *order) {
    bool seen[MAX] = { false };
    seen[start] = true;                   // @anchor INIT
    int queue[MAX], head = 0, tail = 0, n = 0;
    queue[tail++] = start;
    while (head < tail) {
        int node = queue[head++];         // @anchor DEQUEUE
        order[n++] = node;
        for (int k = 0; k < g->degree[node]; k++) {
            int next = g->adj[node][k];
            if (seen[next]) continue;     // @anchor SKIP
            seen[next] = true;
            queue[tail++] = next;         // @anchor ENQUEUE
        }
    }
    return n;                             // @anchor DONE
}`;
