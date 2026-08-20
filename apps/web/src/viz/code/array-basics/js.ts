export default `function insertInto(arr, readIndex, insertAt, value) {
  const n = arr.length;                   // @anchor INIT
  const found = arr[readIndex];           // @anchor READ
  arr.length = n + 1;                     // @anchor GROW
  for (let i = n; i > insertAt; i--) {
    arr[i] = arr[i - 1];                  // @anchor SHIFT
  }
  arr[insertAt] = value;                  // @anchor PLACE
  return { arr, found };                  // @anchor DONE
}`;
