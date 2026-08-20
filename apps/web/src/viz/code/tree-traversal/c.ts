export default `void traverse(const int *tree, int n, Order order, int i, int *out, int *k) {
    if (i >= n) return;                   // @anchor INIT
    if (order == PRE) out[(*k)++] = tree[i];   // @anchor VISIT
    traverse(tree, n, order, 2 * i + 1, out, k);
    if (order == IN) out[(*k)++] = tree[i];
    traverse(tree, n, order, 2 * i + 2, out, k);
    if (order == POST) out[(*k)++] = tree[i];
}                                         // @anchor DONE`;
