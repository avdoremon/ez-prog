export default `int two_sum_sorted(const int *arr, int n, int target, int *out) {
    int lo = 0, hi = n - 1;               // @anchor INIT
    while (lo < hi) {
        int sum = arr[lo] + arr[hi];      // @anchor SUM
        if (sum == target) {
            out[0] = lo; out[1] = hi;     // @anchor FOUND
            return 1;
        }
        if (sum < target) lo++;           // @anchor MOVE_LO
        else hi--;                        // @anchor MOVE_HI
    }
    return 0;                             // @anchor NOT_FOUND
}`;
