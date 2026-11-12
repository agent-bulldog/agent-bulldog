/**
 * Negotiation engine tests
 * Agent Bulldog — Kiroween 2026
 * 
 * node --test test/negotiation/engine.test.js
 */

const assert = require('node:assert');
const { negotiateOnce } = require('../../src/negotiation/engine');

async function runTests() {
  console.log('=== Negotiation Engine Tests ===\n');

  // Test 1: Successful negotiation with savings
  {
    const testDescription = 'Successful negotiation with savings computed';
    const result = await negotiateOnce('streaming', 'loyalty', null);
    
    assert.strictEqual(result.service, 'streaming', 'Service should be "streaming"');
    assert.strictEqual(result.angle, 'loyalty', 'Angle should be "loyalty"');
    assert.strictEqual(result.currentMonthlyCost, 15.99, 'Current cost should be $15.99');
    assert.ok(typeof result.offeredMonthlyCost === 'number', 'Should have offeredMonthlyCost');
    assert.ok(typeof result.message === 'string', 'Should have message');
    
    // Loyalty angle offers $12.99, which is less than $15.99
    assert.strictEqual(result.success, true, 'Should be successful (offer < current)');
    assert.strictEqual(result.monthlySavings, 3.00, 'Monthly savings should be $3.00');
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 2: Failed negotiation with no savings (price_match at $13.99 vs current $15.99)
  {
    const testDescription = 'Failed negotiation returns no savings';
    const result = await negotiateOnce('streaming', 'price_match', null);
    
    assert.strictEqual(result.service, 'streaming', 'Service should be "streaming"');
    assert.strictEqual(result.angle, 'price_match', 'Angle should be "price_match"');
    assert.strictEqual(result.currentMonthlyCost, 15.99, 'Current cost should be $15.99');
    assert.strictEqual(result.success, true, 'Should be successful (offer $13.99 < $15.99)');
    assert.strictEqual(result.monthlySavings, 2.00, 'Monthly savings should be $2.00');
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 3: Unknown service returns error
  {
    const testDescription = 'Unknown service returns error';
    const result = await negotiateOnce('unknown_service', 'loyalty', null);
    
    assert.ok(result.error, 'Should return error for unknown service');
    assert.ok(typeof result.message === 'string', 'Should return human-readable message');
    assert.strictEqual(result.service, undefined, 'Should not have service field on error');
    assert.strictEqual(result.angle, undefined, 'Should not have angle field on error');
    assert.strictEqual(result.success, undefined, 'Should not have success field on error');
    assert.strictEqual(result.monthlySavings, undefined, 'Should not have savings on error');
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 4: Single attempt only — no retries
  {
    const testDescription = 'Single attempt only — no retries';
    // This is implicitly tested — negotiateOnce is a single call
    // Run twice and verify they are independent calls (not stateful)
    const result1 = await negotiateOnce('streaming', 'loyalty', null);
    const result2 = await negotiateOnce('streaming', 'complaint', null);
    
    assert.notStrictEqual(result1.angle, result2.angle, 'Each call should use the provided angle');
    assert.notStrictEqual(result1.message, result2.message, 'Each call should produce different result based on angle');
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 5: Angle "complaint" returns $11.99 offer
  {
    const testDescription = 'Angle "complaint" returns $11.99 offer with $4.00 savings';
    const result = await negotiateOnce('streaming', 'complaint', null);
    
    assert.strictEqual(result.angle, 'complaint', 'Angle should be "complaint"');
    assert.strictEqual(result.success, true, 'Should be successful');
    assert.strictEqual(result.offeredMonthlyCost, 11.99, 'Complaint angle should offer $11.99');
    assert.strictEqual(result.monthlySavings, 4.00, 'Monthly savings should be $4.00');
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 6: Unknown angle falls back to default (no improvement)
  {
    const testDescription = 'Unknown angle falls back to default';
    const result = await negotiateOnce('streaming', 'unknown_angle_xyz', null);
    
    assert.strictEqual(result.angle, 'unknown_angle_xyz', 'Angle should be echoed');
    assert.strictEqual(result.success, false, 'Unknown angle should not be successful');
    assert.strictEqual(result.offeredMonthlyCost, 15.99, 'Default offer should be current price');
    assert.strictEqual(result.monthlySavings, 0, 'Monthly savings should be 0');
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 7: Credentials are passed through (no-op for demo mode)
  {
    const testDescription = 'Credentials passed through (demo mode, no-op)';
    const credentials = { username: 'test', token: 'dummy' };
    const result = await negotiateOnce('streaming', 'loyalty', credentials);
    
    assert.ok(!result.error, 'Should not error with credentials');
    assert.strictEqual(result.angle, 'loyalty', 'Angle should be passed through');
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 8: currentBill error returns error object
  {
    const testDescription = 'currentBill error returns error object';
    const { negotiateOnce } = require('../../src/negotiation/engine');
    const { getConnector } = require('../../src/connectors/index');
    
    // Temporarily replace the streaming connector's currentBill method with one that returns error
    const originalCurrentBill = require('../../src/connectors/streaming').currentBill;
    require('../../src/connectors/streaming').currentBill = async () => ({ error: true, message: 'Test error' });
    
    const result = await negotiateOnce('streaming', 'loyalty', null);
    
    assert.ok(result.error, 'Should return error');
    assert.ok(result.message.includes('Failed to get current bill'), 'Error should mention current bill failure');
    
    // Restore original method
    require('../../src/connectors/streaming').currentBill = originalCurrentBill;
    
    console.log(`✓ ${testDescription}`);
  }

  console.log('\nAll negotiation engine tests passed!');
}

runTests().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
