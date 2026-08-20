export default `def traverse(tree, order, i=0, out=None):
    if out is None:
        out = []
    if i >= len(tree):
        return out                 # @anchor INIT
    if order == "pre":
        out.append(tree[i])        # @anchor VISIT
    traverse(tree, order, 2 * i + 1, out)
    if order == "in":
        out.append(tree[i])
    traverse(tree, order, 2 * i + 2, out)
    if order == "post":
        out.append(tree[i])
    return out                     # @anchor DONE`;
