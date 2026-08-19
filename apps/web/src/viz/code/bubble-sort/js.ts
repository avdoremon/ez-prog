export default `function bubbleSort(arr) {
  arr = [...arr];                        // @anchor INIT
  for (let i = 0; i < arr.length - 1; i++) {
    let swapped = false;
    for (let j = 0; j < arr.length - 1 - i; j++) {
      if (arr[j] > arr[j + 1]) {         // @anchor COMPARE
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];  // @anchor SWAP
        swapped = true;
      }
    }
    // pass finished                     // @anchor PASS_END
    if (!swapped) break;
  }
  return arr;                            // @anchor DONE
}`;
