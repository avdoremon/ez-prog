export default `int dfs(const Graph *g, int start, int *order) {
    bool seen[MAX] = { false };
    seen[start] = true;                   // @anchor INIT
    int stack[MAX], top = 0, n = 0;
    stack[top++] = start;
    while (top > 0) {
        int node = stack[--top];          // @anchor POP
        order[n++] = node;
        for (int k = 0; k < g->degree[node]; k++) {
            int next = g->adj[node][k];
            if (seen[next]) continue;     // @anchor SKIP
            seen[next] = true;
            stack[top++] = next;          // @anchor PUSH
        }
    }
    return n;                             // @anchor DONE
}`;
