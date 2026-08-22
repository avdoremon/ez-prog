export default `#define EMPTY (-1)   /* a real table needs a separate flag */

void ht_init(HashTable *t, int capacity) {
    for (int i = 0; i < capacity; i++)
        t->slots[i] = EMPTY;                    // @anchor INIT
    t->capacity = capacity;
}

bool ht_insert(HashTable *t, int key) {
    int i = key % t->capacity;                  // @anchor HASH
    for (int n = 0; n < t->capacity; n++) {
        if (t->slots[i] == EMPTY) {
            t->slots[i] = key;                  // @anchor PLACE
            return true;
        }
        if (t->slots[i] == key) return true;    // @anchor EXISTS
        i = (i + 1) % t->capacity;              // @anchor PROBE
    }
    return false;                               // @anchor FULL
}

bool ht_has(const HashTable *t, int key) {
    int i = key % t->capacity;
    for (int n = 0; n < t->capacity; n++) {
        if (t->slots[i] == key) return true;    // @anchor DONE
        if (t->slots[i] == EMPTY) return false; // @anchor MISS
        i = (i + 1) % t->capacity;
    }
    return false;
}`;
