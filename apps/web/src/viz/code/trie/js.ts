export default `function insert(root, word) {          // @anchor INIT
  let node = root;
  for (const ch of word) {
    if (!node.children.has(ch)) {
      node.children.set(ch, newNode());  // @anchor STEP
    }
    node = node.children.get(ch);
  }
  node.isWord = true;
}

function search(root, word) {
  let node = root;
  for (const ch of word) {
    if (!node.children.has(ch)) return false;
    node = node.children.get(ch);        // @anchor SEARCH
  }
  return node.isWord;                    // @anchor DONE
}`;
