export default `from collections import deque

def bfs(adj, start):
    seen = {start}                 # @anchor INIT
    queue, order = deque([start]), []
    while queue:
        node = queue.popleft()     # @anchor DEQUEUE
        order.append(node)
        for nxt in adj[node]:
            if nxt in seen:
                continue           # @anchor SKIP
            seen.add(nxt)
            queue.append(nxt)      # @anchor ENQUEUE
    return order                   # @anchor DONE`;
