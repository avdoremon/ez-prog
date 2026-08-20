export default `function mergeSort(arr, lo = 0, hi = arr.length - 1) {
  if (lo >= hi) return arr;              // @anchor INIT
  const mid = (lo + hi) >> 1;            // @anchor SPLIT
  mergeSort(arr, lo, mid);
  mergeSort(arr, mid + 1, hi);
  const left = arr.slice(lo, mid + 1);
  const right = arr.slice(mid + 1, hi + 1);
  let i = 0, j = 0, k = lo;
  while (i < left.length && j < right.length) {
    const takeLeft = left[i] <= right[j];        // @anchor COMPARE
    arr[k++] = takeLeft ? left[i++] : right[j++];  // @anchor WRITE
  }
  while (i < left.length) arr[k++] = left[i++];
  while (j < right.length) arr[k++] = right[j++];  // @anchor MERGED
  return arr;                            // @anchor DONE
}`;
