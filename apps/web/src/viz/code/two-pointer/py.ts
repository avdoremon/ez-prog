export default `def two_sum_sorted(arr, target):
    lo, hi = 0, len(arr) - 1       # @anchor INIT
    while lo < hi:
        total = arr[lo] + arr[hi]  # @anchor SUM
        if total == target:
            return (lo, hi)        # @anchor FOUND
        if total < target:
            lo += 1                # @anchor MOVE_LO
        else:
            hi -= 1                # @anchor MOVE_HI
    return None                    # @anchor NOT_FOUND`;
