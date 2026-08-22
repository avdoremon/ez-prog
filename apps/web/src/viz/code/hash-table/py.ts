export default `class HashTable:
    def __init__(self, capacity):
        self.slots = [None] * capacity     # @anchor INIT
        self.capacity = capacity

    def insert(self, key):
        i = key % self.capacity            # @anchor HASH
        for _ in range(self.capacity):
            if self.slots[i] is None:
                self.slots[i] = key        # @anchor PLACE
                return True
            if self.slots[i] == key:
                return True                # @anchor EXISTS
            i = (i + 1) % self.capacity    # @anchor PROBE
        return False                       # @anchor FULL

    def has(self, key):
        i = key % self.capacity
        for _ in range(self.capacity):
            if self.slots[i] == key:
                return True                # @anchor DONE
            if self.slots[i] is None:
                return False               # @anchor MISS
            i = (i + 1) % self.capacity
        return False`;
