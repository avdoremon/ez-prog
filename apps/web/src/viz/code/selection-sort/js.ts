export default `function selectionSort(arr) {
  arr = [...arr];                          // @anchor INIT
  for (let i = 0; i < arr.length - 1; i++) {
    let min = i;                           // @anchor PASS
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[j] < arr[min])               // @anchor SCAN
        min = j;                           // @anchor NEW_MIN
    }
    if (min !== i)                         // @anchor SWAP
      [arr[i], arr[min]] = [arr[min], arr[i]];
  }
  return arr;                              // @anchor DONE
}`;
