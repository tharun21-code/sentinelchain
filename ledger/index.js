// Ledger - Placeholder implementation
console.log('Ledger initialized');

class Ledger {
  constructor() {
    this.blocks = [];
  }

  addBlock(data) {
    const block = { data, timestamp: Date.now() };
    this.blocks.push(block);
    console.log('Block added:', block);
  }

  getBlocks() {
    return this.blocks;
  }
}

const ledger = new Ledger();

module.exports = { Ledger, ledger };
