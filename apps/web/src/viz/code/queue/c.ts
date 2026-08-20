export default `int run_queue(const int *ops, int n, int *queue) {
    int size = 0;                         // @anchor INIT
    for (int i = 0; i < n; i++) {
        if (ops[i] != DEQUEUE_MARKER) {
            queue[size++] = ops[i];       // @anchor ENQUEUE
        } else if (size == 0) {
            continue;                     // @anchor EMPTY
        } else {
            int front = queue[0];         // @anchor DEQUEUE
            for (int j = 1; j < size; j++) {
                queue[j - 1] = queue[j];  // @anchor SHIFT
            }
            size--;
        }
    }
    return size;                          // @anchor DONE
}`;
