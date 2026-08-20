export default `def heap_insert(heap, value):
    parent = lambda i: (i - 1) // 2   # @anchor INIT
    heap.append(value)                # @anchor INSERT
    i = len(heap) - 1
    while i > 0 and heap[parent(i)] < heap[i]:
        p = parent(i)                 # @anchor SIFT_UP
        heap[p], heap[i] = heap[i], heap[p]
        i = p
    return heap                       # @anchor DONE

def extract_max(heap):
    largest_value = heap[0]           # @anchor EXTRACT
    last = heap.pop()
    if not heap:
        return largest_value
    heap[0] = last
    i = 0
    while True:
        big = i
        if 2 * i + 1 < len(heap) and heap[2 * i + 1] > heap[big]:
            big = 2 * i + 1
        if 2 * i + 2 < len(heap) and heap[2 * i + 2] > heap[big]:
            big = 2 * i + 2
        if big == i:
            return largest_value      # @anchor SIFT_DOWN
        heap[i], heap[big] = heap[big], heap[i]
        i = big`;
