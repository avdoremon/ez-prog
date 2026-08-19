export default `def linear_search(arr, target):
    checked = 0                   # @anchor INIT
    for i, value in enumerate(arr):
        checked += 1
        match = value == target   # @anchor COMPARE
        if match:
            return i               # @anchor FOUND
    return -1                     # @anchor NOT_FOUND`;
