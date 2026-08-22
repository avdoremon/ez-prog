export default `void selection_sort(int *arr, int n) {
    // arr already a working copy       // @anchor INIT
    for (int i = 0; i < n - 1; i++) {
        int min = i;                    // @anchor PASS
        for (int j = i + 1; j < n; j++) {
            if (arr[j] < arr[min])      // @anchor SCAN
                min = j;                // @anchor NEW_MIN
        }
        if (min != i) {                 // @anchor SWAP
            int tmp = arr[i];
            arr[i] = arr[min];
            arr[min] = tmp;
        }
    }
    // sorted                           // @anchor DONE
}`;
