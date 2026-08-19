export default `function linearSearch(arr, target) {
  let checked = 0;                       // @anchor INIT
  for (let i = 0; i < arr.length; i++) {
    checked++;
    const match = arr[i] === target;     // @anchor COMPARE
    if (match) return i;                 // @anchor FOUND
  }
  return -1;                             // @anchor NOT_FOUND
}`;
