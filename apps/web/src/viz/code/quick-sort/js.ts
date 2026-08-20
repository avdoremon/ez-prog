export default `function quickSort(arr, lo = 0, hi = arr.length - 1) {
  if (lo >= hi) return arr;              // @anchor INIT
  const pivot = arr[hi];                 // @anchor PIVOT
  let small = lo;
  for (let i = lo; i < hi; i++) {
    if (arr[i] < pivot) {                // @anchor COMPARE
      [arr[small], arr[i]] = [arr[i], arr[small]];  // @anchor SWAP
      small++;
    }
  }
  [arr[small], arr[hi]] = [arr[hi], arr[small]];    // @anchor PLACE
  quickSort(arr, lo, small - 1);
  quickSort(arr, small + 1, hi);
  return arr;                            // @anchor DONE
}`;
