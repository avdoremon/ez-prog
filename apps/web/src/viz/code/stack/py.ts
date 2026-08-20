export default `def run_stack(ops):
    stack = []                     # @anchor INIT
    for op in ops:
        if op is not None:
            stack.append(op)       # @anchor PUSH
        elif not stack:
            continue               # @anchor EMPTY
        else:
            stack.pop()            # @anchor POP
    return stack                   # @anchor DONE`;
