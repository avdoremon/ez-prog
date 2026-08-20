export default `function bstSearch(tree, target) {
  let i = 0;                             // @anchor INIT
  while (i < tree.length) {
    if (target === tree[i]) return i;    // @anchor FOUND
    if (target < tree[i]) {              // @anchor COMPARE
      i = 2 * i + 1;                     // @anchor GO_LEFT
    } else {
      i = 2 * i + 2;                     // @anchor GO_RIGHT
    }
  }
  return -1;                             // @anchor MISSING
}`;
