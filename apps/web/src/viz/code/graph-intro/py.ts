export default `def describe(values, edges, directed):
    adj = [[] for _ in values]     # @anchor INIT
    for frm, to in edges:
        adj[frm].append(to)        # @anchor NODE
        if not directed:
            adj[to].append(frm)
    degrees = [len(a) for a in adj]
    return adj, degrees            # @anchor DONE`;
