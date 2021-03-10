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

  clear() {
    this.head = this.tail = null;
    this.length = 0;
  }

  first() {
    return this.head.data;
  }

  concat(n) {
    if (this.length === 0)
      return Buffer.alloc(0);
    const ret = Buffer.allocUnsafe(n >>> 0);
    let p = this.head;
    let i = 0;
    while (p) {
      Uint8Array.prototype.set.call(ret, p.data, i);
      i += p.data.length;
      p = p.next;
    }
    return ret;
  }
}

module.exports = BufferList;
