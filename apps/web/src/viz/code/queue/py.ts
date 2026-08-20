export default `def run_queue(ops):
    queue = []                       # @anchor INIT
    for op in ops:
        if op is not None:
            queue.append(op)         # @anchor ENQUEUE
        elif not queue:
            continue                 # @anchor EMPTY
        else:
            front = queue[0]         # @anchor DEQUEUE
            for i in range(1, len(queue)):
                queue[i - 1] = queue[i]  # @anchor SHIFT
            queue.pop()
    return queue                     # @anchor DONE`;
