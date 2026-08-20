export default `def push(arr, value):
    # arr = {"data": [...], "size": n, "capacity": c}   # @anchor INIT
    if arr["size"] == arr["capacity"]:
        bigger = [None] * (arr["capacity"] * 2)   # @anchor GROW
        for i in range(arr["size"]):
            bigger[i] = arr["data"][i]            # @anchor COPY
        arr["data"] = bigger
        arr["capacity"] *= 2
    arr["data"][arr["size"]] = value              # @anchor APPEND
    arr["size"] += 1
    return arr                                    # @anchor DONE`;
