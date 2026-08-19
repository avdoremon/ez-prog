export default `int linear_search(const int *arr, int n, int target) {
    int checked = 0;                   // @anchor INIT
    for (int i = 0; i < n; i++) {
        checked++;
        int match = arr[i] == target;  // @anchor COMPARE
        if (match) return i;           // @anchor FOUND
    }
    return -1;                         // @anchor NOT_FOUND
}`;
