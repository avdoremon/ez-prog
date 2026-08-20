export default `int run_stack(const int *ops, int n, int *stack) {
    int top = 0;                          // @anchor INIT
    for (int i = 0; i < n; i++) {
        if (ops[i] != POP_MARKER) {
            stack[top++] = ops[i];        // @anchor PUSH
        } else if (top == 0) {
            continue;                     // @anchor EMPTY
        } else {
            top--;                        // @anchor POP
        }
    }
    return top;                           // @anchor DONE
}`;
