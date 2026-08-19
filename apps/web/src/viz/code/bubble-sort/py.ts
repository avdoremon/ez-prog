export default `def bubble_sort(arr):
    arr = list(arr)                # @anchor INIT
    for i in range(len(arr) - 1):
        swapped = False
        for j in range(len(arr) - 1 - i):
            if arr[j] > arr[j + 1]:        # @anchor COMPARE
                arr[j], arr[j + 1] = arr[j + 1], arr[j]  # @anchor SWAP
                swapped = True
        # pass finished              # @anchor PASS_END
        if not swapped:
            break
    return arr                       # @anchor DONE`;
