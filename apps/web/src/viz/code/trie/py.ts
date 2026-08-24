export default `def insert(root, word):               # @anchor INIT
    node = root
    for ch in word:
        if ch not in node.children:
            node.children[ch] = Node()  # @anchor STEP
        node = node.children[ch]
    node.is_word = True


def search(root, word):
    node = root
    for ch in word:
        if ch not in node.children:
            return False
        node = node.children[ch]        # @anchor SEARCH
    return node.is_word                 # @anchor DONE`;
