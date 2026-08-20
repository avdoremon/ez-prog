export default `void describe(Graph *g, const Edge *edges, int m, bool directed) {
    for (int i = 0; i < g->n; i++) g->degree[i] = 0;   // @anchor INIT
    for (int e = 0; e < m; e++) {
        g->adj[edges[e].from][g->degree[edges[e].from]++] = edges[e].to;  // @anchor NODE
        if (!directed)
            g->adj[edges[e].to][g->degree[edges[e].to]++] = edges[e].from;
    }
}                                                      // @anchor DONE`;
