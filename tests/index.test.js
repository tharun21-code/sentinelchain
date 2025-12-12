// Basic tests
const { ledger } = require('../ledger');

describe('Ledger', () => {
  test('should add a block', () => {
    ledger.addBlock('test data');
    expect(ledger.getBlocks().length).toBeGreaterThan(0);
  });
});
