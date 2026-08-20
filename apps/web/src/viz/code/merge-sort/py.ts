export default `def merge_sort(arr, lo=0, hi=None):
    if hi is None:
        hi = len(arr) - 1
    if lo >= hi:
        return arr                 # @anchor INIT
    mid = (lo + hi) // 2           # @anchor SPLIT
    merge_sort(arr, lo, mid)
    merge_sort(arr, mid + 1, hi)
    left = arr[lo:mid + 1]
    right = arr[mid + 1:hi + 1]
    i = j = 0
    k = lo
    while i < len(left) and j < len(right):
        take_left = left[i] <= right[j]    # @anchor COMPARE
        if take_left:
            arr[k] = left[i]               # @anchor WRITE
            i += 1
        else:
            arr[k] = right[j]
            j += 1
        k += 1
    while i < len(left):
        arr[k] = left[i]
        i += 1
        k += 1
    while j < len(right):
        arr[k] = right[j]          # @anchor MERGED
        j += 1
        k += 1
    return arr                     # @anchor DONE`;
