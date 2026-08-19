export default `function binarySearch(arr, target) {
  let lo = 0, hi = arr.length - 1;   // @anchor INIT
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;      // @anchor MID
    if (arr[mid] === target) return mid;   // @anchor FOUND
    if (arr[mid] < target) lo = mid + 1;   // @anchor DISCARD_LEFT
    else hi = mid - 1;               // @anchor DISCARD_RIGHT
  }
  return -1;                         // @anchor NOT_FOUND
}`;
