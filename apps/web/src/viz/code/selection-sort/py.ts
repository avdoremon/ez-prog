export default `def selection_sort(arr):
    arr = list(arr)                  # @anchor INIT
    for i in range(len(arr) - 1):
        low = i                      # @anchor PASS
        for j in range(i + 1, len(arr)):
            if arr[j] < arr[low]:    # @anchor SCAN
                low = j              # @anchor NEW_MIN
        if low != i:                 # @anchor SWAP
            arr[i], arr[low] = arr[low], arr[i]
    return arr                       # @anchor DONE`;
