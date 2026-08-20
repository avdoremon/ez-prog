export default `def insert_into(arr, read_index, insert_at, value):
    n = len(arr)                   # @anchor INIT
    found = arr[read_index]        # @anchor READ
    arr.append(arr[-1])            # @anchor GROW
    for i in range(n, insert_at, -1):
        arr[i] = arr[i - 1]        # @anchor SHIFT
    arr[insert_at] = value         # @anchor PLACE
    return arr, found              # @anchor DONE`;
