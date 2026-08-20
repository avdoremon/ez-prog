export default `function runQueue(ops) {
  const queue = [];                      // @anchor INIT
  for (const op of ops) {
    if (op !== null) {
      queue.push(op);                    // @anchor ENQUEUE
    } else if (queue.length === 0) {
      continue;                          // @anchor EMPTY
    } else {
      const front = queue[0];            // @anchor DEQUEUE
      for (let i = 1; i < queue.length; i++) {
        queue[i - 1] = queue[i];         // @anchor SHIFT
      }
      queue.length--;
    }
  }
  return queue;                          // @anchor DONE
}`;
