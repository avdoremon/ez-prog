export default `def read_then_insert(head, read_index, insert_at, value):
    node = head                       # @anchor INIT
    for _ in range(read_index):
        node = node.next              # @anchor STEP
    found = node.value                # @anchor FOUND
    prev, cur = None, head
    for _ in range(insert_at):
        prev = cur                    # @anchor LOCATE
        cur = cur.next
    fresh = Node(value, cur)
    if prev:
        prev.next = fresh             # @anchor INSERT
    else:
        head = fresh
    return found, head                # @anchor DONE`;
