class Node {
  constructor(data, next = null) {
    this.data = data;
    this.next = next;
  }
}
class BufferList {
  constructor() {
    this.head = null;
    this.tail = null;
    this.length = 0;
  }
}

module.exports = BufferList;
