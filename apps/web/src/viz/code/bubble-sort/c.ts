export default `void bubble_sort(int *arr, int n) {
    // arr already a working copy         // @anchor INIT
    for (int i = 0; i < n - 1; i++) {
        int swapped = 0;
        for (int j = 0; j < n - 1 - i; j++) {
            if (arr[j] > arr[j + 1]) {     // @anchor COMPARE
                int tmp = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = tmp;          // @anchor SWAP
                swapped = 1;
            }
        }
        // pass finished                  // @anchor PASS_END
        if (!swapped) break;
    }
    // sorted                             // @anchor DONE
}`;
