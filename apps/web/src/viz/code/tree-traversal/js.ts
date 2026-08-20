export default `function traverse(tree, order, i = 0, out = []) {
  if (i >= tree.length) return out;      // @anchor INIT
  if (order === 'pre') out.push(tree[i]);        // @anchor VISIT
  traverse(tree, order, 2 * i + 1, out);
  if (order === 'in') out.push(tree[i]);
  traverse(tree, order, 2 * i + 2, out);
  if (order === 'post') out.push(tree[i]);
  return out;                            // @anchor DONE
}`;
