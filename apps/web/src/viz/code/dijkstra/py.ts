export default `from math import inf

def dijkstra(adj, start, n):
    dist = [inf] * n
    dist[start] = 0                  # @anchor INIT
    settled = set()
    while True:
        node = -1                    # @anchor PICK
        for i in range(n):
            if i in settled:
                continue
            if node < 0 or dist[i] < dist[node]:
                node = i
        if node < 0 or dist[node] == inf:
            break
        settled.add(node)
        for to, weight in adj[node]:
            via = dist[node] + weight
            if to in settled or via >= dist[to]:
                continue             # @anchor SKIP
            dist[to] = via           # @anchor IMPROVE
    return dist                      # @anchor DONE`;
