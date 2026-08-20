export default `function push(arr, value) {
  // arr = { data, size, capacity }      // @anchor INIT
  if (arr.size === arr.capacity) {
    const bigger = new Array(arr.capacity * 2);  // @anchor GROW
    for (let i = 0; i < arr.size; i++) {
      bigger[i] = arr.data[i];           // @anchor COPY
    }
    arr.data = bigger;
    arr.capacity *= 2;
  }
  arr.data[arr.size++] = value;          // @anchor APPEND
  return arr;                            // @anchor DONE
}`;
