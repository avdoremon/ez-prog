export default `def binary_search(arr, target):
    lo, hi = 0, len(arr) - 1      # @anchor INIT
    while lo <= hi:
        mid = (lo + hi) // 2      # @anchor MID
        if arr[mid] == target:
            return mid            # @anchor FOUND
        if arr[mid] < target:
            lo = mid + 1          # @anchor DISCARD_LEFT
        else:
            hi = mid - 1          # @anchor DISCARD_RIGHT
    return -1                     # @anchor NOT_FOUND`;
