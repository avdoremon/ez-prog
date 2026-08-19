export default `void insertion_sort(int *arr, int n) {
    // arr already a working copy         // @anchor INIT
    for (int i = 1; i < n; i++) {
        int key = arr[i];                 // @anchor KEY
        int j = i - 1;
        while (j >= 0 && arr[j] > key) {  // @anchor COMPARE
            arr[j + 1] = arr[j];          // @anchor SHIFT
            j--;
        }
        arr[j + 1] = key;                 // @anchor PLACE
    }
    // sorted                             // @anchor DONE
}`;
