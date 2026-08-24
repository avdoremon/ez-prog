export default `typedef struct Node {
    struct Node *children[26];        // @anchor INIT
    int is_word;
} Node;

void insert(Node *root, const char *word) {
    Node *node = root;
    for (int i = 0; word[i]; i++) {
        int c = word[i] - 'a';
        if (!node->children[c]) {
            node->children[c] = new_node();  // @anchor STEP
        }
        node = node->children[c];
    }
    node->is_word = 1;
}

int search(Node *root, const char *word) {
    Node *node = root;
    for (int i = 0; word[i]; i++) {
        int c = word[i] - 'a';
        if (!node->children[c]) return 0;
        node = node->children[c];     // @anchor SEARCH
    }
    return node->is_word;             // @anchor DONE
}`;
