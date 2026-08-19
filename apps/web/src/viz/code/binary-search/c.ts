export default `int binary_search(const int *arr, int n, int target) {
    int lo = 0, hi = n - 1;            // @anchor INIT
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;  // @anchor MID
        if (arr[mid] == target) return mid;  // @anchor FOUND
        if (arr[mid] < target) lo = mid + 1; // @anchor DISCARD_LEFT
        else hi = mid - 1;             // @anchor DISCARD_RIGHT
    }
    return -1;                         // @anchor NOT_FOUND
}`;
