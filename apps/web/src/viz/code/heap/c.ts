export default `static int parent(int i) { return (i - 1) / 2; }   // @anchor INIT

void heap_insert(int *heap, int *size, int value) {
    heap[(*size)++] = value;              // @anchor INSERT
    int i = *size - 1;
    while (i > 0 && heap[parent(i)] < heap[i]) {
        int p = parent(i);                // @anchor SIFT_UP
        int tmp = heap[p]; heap[p] = heap[i]; heap[i] = tmp;
        i = p;
    }
}                                         // @anchor DONE

int extract_max(int *heap, int *size) {
    int max = heap[0];                    // @anchor EXTRACT
    heap[0] = heap[--(*size)];
    int i = 0;
    for (;;) {
        int big = i, l = 2 * i + 1, r = 2 * i + 2;
        if (l < *size && heap[l] > heap[big]) big = l;
        if (r < *size && heap[r] > heap[big]) big = r;
        if (big == i) return max;         // @anchor SIFT_DOWN
        int tmp = heap[i]; heap[i] = heap[big]; heap[big] = tmp;
        i = big;
    }
}`;
