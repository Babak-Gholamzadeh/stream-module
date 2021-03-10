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

  push(data) {
    const node = new Node(data);
    if (this.length > 0)
      this.tail.next = node;
    else
      this.head = node;
    this.tail = node;
    ++this.length;
  }

  unshift(data) {
    const node = new Node(data, this.head);
    this.head = node;
    if (this.length === 0)
      this.tail = node;
    ++this.length;
  }

  shift() {
    if (this.length === 0)
      return;
    const ret = this.head.data;
    if (this.length === 1)
      this.head = this.tail = null;
    else
      this.head = this.head.next;
    --this.length;
    return ret;
  }
}

module.exports = BufferList;
