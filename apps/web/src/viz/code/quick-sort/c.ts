export default `void quick_sort(int *arr, int lo, int hi) {
    if (lo >= hi) return;                 // @anchor INIT
    int pivot = arr[hi];                  // @anchor PIVOT
    int small = lo, tmp;
    for (int i = lo; i < hi; i++) {
        if (arr[i] < pivot) {             // @anchor COMPARE
            tmp = arr[small];
            arr[small] = arr[i];
            arr[i] = tmp;                 // @anchor SWAP
            small++;
        }
    }
    tmp = arr[small];
    arr[small] = arr[hi];
    arr[hi] = tmp;                        // @anchor PLACE
    quick_sort(arr, lo, small - 1);
    quick_sort(arr, small + 1, hi);
}                                         // @anchor DONE`;
