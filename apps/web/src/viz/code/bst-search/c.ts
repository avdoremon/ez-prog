export default `int bst_search(const int *tree, int n, int target) {
    int i = 0;                            // @anchor INIT
    while (i < n) {
        if (target == tree[i]) return i;  // @anchor FOUND
        if (target < tree[i]) {           // @anchor COMPARE
            i = 2 * i + 1;                // @anchor GO_LEFT
        } else {
            i = 2 * i + 2;                // @anchor GO_RIGHT
        }
    }
    return -1;                            // @anchor MISSING
}`;
