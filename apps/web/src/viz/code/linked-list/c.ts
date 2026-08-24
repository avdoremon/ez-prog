export default `typedef struct Node { int value; struct Node *next; } Node;

int read_then_insert(Node **head, int read_index,
                      int insert_at, int value) {
    Node *node = *head;                   // @anchor INIT
    for (int i = 0; i < read_index; i++) {
        node = node->next;                // @anchor STEP
    }
    int found = node->value;              // @anchor FOUND
    Node *prev = NULL, *cur = *head;
    for (int i = 0; i < insert_at; i++) {
        prev = cur;                       // @anchor LOCATE
        cur = cur->next;
    }
    Node *fresh = malloc(sizeof(Node));
    fresh->value = value;
    fresh->next = cur;
    if (prev) prev->next = fresh;         // @anchor INSERT
    else *head = fresh;
    return found;                         // @anchor DONE
}`;
