export default `function heapInsert(heap, value) {
  const parent = (i) => (i - 1) >> 1;    // @anchor INIT
  heap.push(value);                      // @anchor INSERT
  let i = heap.length - 1;
  while (i > 0 && heap[parent(i)] < heap[i]) {
    const p = parent(i);                 // @anchor SIFT_UP
    [heap[p], heap[i]] = [heap[i], heap[p]];
    i = p;
  }
  return heap;                           // @anchor DONE
}

function extractMax(heap) {
  const max = heap[0];                   // @anchor EXTRACT
  const last = heap.pop();
  if (heap.length === 0) return max;
  heap[0] = last;
  let i = 0;
  for (;;) {
    let big = i;
    if (2 * i + 1 < heap.length && heap[2 * i + 1] > heap[big]) big = 2 * i + 1;
    if (2 * i + 2 < heap.length && heap[2 * i + 2] > heap[big]) big = 2 * i + 2;
    if (big === i) return max;           // @anchor SIFT_DOWN
    [heap[i], heap[big]] = [heap[big], heap[i]];
    i = big;
  }
}`;
