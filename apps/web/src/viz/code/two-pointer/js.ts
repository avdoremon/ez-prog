export default `function twoSumSorted(arr, target) {
  let lo = 0, hi = arr.length - 1;        // @anchor INIT
  while (lo < hi) {
    const sum = arr[lo] + arr[hi];        // @anchor SUM
    if (sum === target) return [lo, hi];  // @anchor FOUND
    if (sum < target) lo++;               // @anchor MOVE_LO
    else hi--;                            // @anchor MOVE_HI
  }
  return null;                            // @anchor NOT_FOUND
}`;
