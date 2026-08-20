export default `void push(DynArray *arr, int value) {
    /* arr holds data, size, capacity */  // @anchor INIT
    if (arr->size == arr->capacity) {
        int *bigger = malloc(sizeof(int) * arr->capacity * 2);  // @anchor GROW
        for (int i = 0; i < arr->size; i++) {
            bigger[i] = arr->data[i];     // @anchor COPY
        }
        free(arr->data);
        arr->data = bigger;
        arr->capacity *= 2;
    }
    arr->data[arr->size++] = value;       // @anchor APPEND
}                                         // @anchor DONE`;
