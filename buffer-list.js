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

  consume(n) {
    const data = this.head.data;
    if (n < data.length) {
      const ret = data.slice(0, n);
      this.head.data = data.slice(n);
      return ret;
    }

    if (n === data.length)
      return this.shift();

    const ret = Buffer.allocUnsafe(n);
    const retLen = n;
    let p = this.head;
    let c = 0;
    do {
      const buf = p.data;
      if (n > buf.length) {
        Uint8Array.prototype.set.call(ret, buf, retLen - n);
        n -= buf.length;
      } else {
        if (n === buf.length) {
          Uint8Array.prototype.set.call(ret, buf, retLen - n);
          ++c;
          if (p.next)
            this.head = p.next;
          else
            this.head = this.tail = null;
        } else {
          Uint8Array.prototype.set.call(ret,
            new Uint8Array(buf.buffer, buf.byteOffset, n),
            retLen - n);
          p.data = buf.slice(n);
          this.head = p;
        }
        break;
      }
      ++c;
    } while (p = p.next);
    this.length -= c;
    return ret;
  }
}

module.exports = BufferList;
