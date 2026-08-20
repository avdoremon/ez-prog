export default `def dfs(adj, start):
    seen = {start}                 # @anchor INIT
    stack, order = [start], []
    while stack:
        node = stack.pop()         # @anchor POP
        order.append(node)
        for nxt in adj[node]:
            if nxt in seen:
                continue           # @anchor SKIP
            seen.add(nxt)
            stack.append(nxt)      # @anchor PUSH
    return order                   # @anchor DONE`;
