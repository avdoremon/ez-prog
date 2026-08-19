export default `function insertionSort(arr) {
  arr = [...arr];                        // @anchor INIT
  for (let i = 1; i < arr.length; i++) {
    const key = arr[i];                  // @anchor KEY
    let j = i - 1;
    while (j >= 0 && arr[j] > key) {     // @anchor COMPARE
      arr[j + 1] = arr[j];               // @anchor SHIFT
      j--;
    }
    arr[j + 1] = key;                    // @anchor PLACE
  }
  return arr;                            // @anchor DONE
}`;
