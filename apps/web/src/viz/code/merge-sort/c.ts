export default `void merge_sort(int *arr, int lo, int hi, int *buf) {
    if (lo >= hi) return;                 // @anchor INIT
    int mid = (lo + hi) / 2;              // @anchor SPLIT
    merge_sort(arr, lo, mid, buf);
    merge_sort(arr, mid + 1, hi, buf);
    for (int t = lo; t <= hi; t++) buf[t] = arr[t];
    int i = lo, j = mid + 1, k = lo;
    while (i <= mid && j <= hi) {
        int take_left = buf[i] <= buf[j]; // @anchor COMPARE
        arr[k++] = take_left ? buf[i++] : buf[j++];  // @anchor WRITE
    }
    while (i <= mid) arr[k++] = buf[i++];
    while (j <= hi) arr[k++] = buf[j++];  // @anchor MERGED
}                                         // @anchor DONE`;
