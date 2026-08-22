export default `class HashTable {
  constructor(capacity) {
    this.slots = Array(capacity).fill(null);   // @anchor INIT
    this.capacity = capacity;
  }
  insert(key) {
    let i = key % this.capacity;               // @anchor HASH
    for (let n = 0; n < this.capacity; n++) {
      if (this.slots[i] === null) {
        this.slots[i] = key;                   // @anchor PLACE
        return true;
      }
      if (this.slots[i] === key) return true;  // @anchor EXISTS
      i = (i + 1) % this.capacity;             // @anchor PROBE
    }
    return false;                              // @anchor FULL
  }
  has(key) {
    let i = key % this.capacity;
    for (let n = 0; n < this.capacity; n++) {
      if (this.slots[i] === key) return true;    // @anchor DONE
      if (this.slots[i] === null) return false;  // @anchor MISS
      i = (i + 1) % this.capacity;
    }
    return false;
  }
}`;
