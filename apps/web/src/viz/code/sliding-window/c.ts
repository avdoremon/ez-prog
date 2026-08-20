export default `int max_window_sum(const int *arr, int n, int k, int *best_start) {
    int sum = 0;                          // @anchor INIT
    for (int i = 0; i < k; i++)
        sum += arr[i];                    // @anchor ADD
    int best = sum;
    *best_start = 0;
    for (int i = k; i < n; i++) {
        sum += arr[i] - arr[i - k];       // @anchor SLIDE
        if (sum > best) {                 // @anchor BEST
            best = sum;
            *best_start = i - k + 1;
        }
    }
    return best;                          // @anchor DONE
}`;
