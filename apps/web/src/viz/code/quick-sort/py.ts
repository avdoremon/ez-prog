export default `def quick_sort(arr, lo=0, hi=None):
    if hi is None:
        hi = len(arr) - 1
    if lo >= hi:
        return arr                 # @anchor INIT
    pivot = arr[hi]                # @anchor PIVOT
    small = lo
    for i in range(lo, hi):
        if arr[i] < pivot:         # @anchor COMPARE
            arr[small], arr[i] = arr[i], arr[small]   # @anchor SWAP
            small += 1
    arr[small], arr[hi] = arr[hi], arr[small]         # @anchor PLACE
    quick_sort(arr, lo, small - 1)
    quick_sort(arr, small + 1, hi)
    return arr                     # @anchor DONE`;
