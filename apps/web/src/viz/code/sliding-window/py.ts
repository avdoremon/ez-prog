export default `def max_window_sum(arr, k):
    total = 0                          # @anchor INIT
    for i in range(k):
        total += arr[i]                # @anchor ADD
    best, best_start = total, 0
    for i in range(k, len(arr)):
        total += arr[i] - arr[i - k]   # @anchor SLIDE
        if total > best:               # @anchor BEST
            best = total
            best_start = i - k + 1
    return best, best_start            # @anchor DONE`;
