export default `function readThenInsert(list, readIndex, insertAt, value) {
  let node = list.head;                 // @anchor INIT
  for (let i = 0; i < readIndex; i++) {
    node = node.next;                   // @anchor STEP
  }
  const found = node.value;             // @anchor FOUND
  let prev = null;
  let cur = list.head;
  for (let i = 0; i < insertAt; i++) {
    prev = cur;                         // @anchor LOCATE
    cur = cur.next;
  }
  const fresh = { value, next: cur };
  if (prev) prev.next = fresh;          // @anchor INSERT
  else list.head = fresh;
  return found;                         // @anchor DONE
}`;
