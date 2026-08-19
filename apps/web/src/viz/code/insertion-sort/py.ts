export default `def insertion_sort(arr):
    arr = list(arr)                # @anchor INIT
    for i in range(1, len(arr)):
        key = arr[i]               # @anchor KEY
        j = i - 1
        while j >= 0 and arr[j] > key:   # @anchor COMPARE
            arr[j + 1] = arr[j]          # @anchor SHIFT
            j -= 1
        arr[j + 1] = key                 # @anchor PLACE
    return arr                     # @anchor DONE`;
