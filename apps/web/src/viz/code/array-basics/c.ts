export default `int insert_into(int *arr, int n, int read_index, int insert_at, int value) {
    int found = 0;                        // @anchor INIT
    found = arr[read_index];              // @anchor READ
    /* caller guarantees capacity for n + 1 */  // @anchor GROW
    for (int i = n; i > insert_at; i--) {
        arr[i] = arr[i - 1];              // @anchor SHIFT
    }
    arr[insert_at] = value;               // @anchor PLACE
    return found;                         // @anchor DONE
}`;
