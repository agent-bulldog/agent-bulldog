/**
 * Streaming connector tests
 * Agent Bulldog — Kiroween 2026
 * 
 * node --test test/connectors/streaming.test.js
 */

const assert = require('node:assert');
const streaming = require('../../src/connectors/streaming');
const { validateConnector, listServices, getConnector } = require('../../src/connectors/index');

// Main test function
async function runTests() {
  // Test 1: Connector exports all four required methods
  {
    const testDescription = 'streaming connector exports all four required methods';
    assert.ok(streaming.listPlans, 'listPlans method exists');
    assert.ok(streaming.currentBill, 'currentBill method exists');
    assert.ok(streaming.negotiate, 'negotiate method exists');
    assert.ok(streaming.cancelFlowPreview, 'cancelFlowPreview method exists');
    console.log(`✓ ${testDescription}`);
  }

  // Test 2: listPlans returns 3 plans
  {
    const testDescription = 'listPlans returns 3 plans';
    const plans = await streaming.listPlans();
    assert.strictEqual(plans.length, 3, `Expected 3 plans, got ${plans.length}`);
    console.log(`✓ ${testDescription}`);
  }

  // Test 3: listPlans returns correct plan names and prices
  {
    const testDescription = 'listPlans returns correct plan names and prices';
    const plans = await streaming.listPlans();
    assert.strictEqual(plans[0].name, 'Basic', 'First plan should be Basic');
    assert.strictEqual(plans[0].monthlyCost, 8.99, 'Basic plan should cost $8.99');
    assert.strictEqual(plans[1].name, 'Standard', 'Second plan should be Standard');
    assert.strictEqual(plans[1].monthlyCost, 15.99, 'Standard plan should cost $15.99');
    assert.strictEqual(plans[2].name, 'Premium', 'Third plan should be Premium');
    assert.strictEqual(plans[2].monthlyCost, 21.99, 'Premium plan should cost $21.99');
    console.log(`✓ ${testDescription}`);
  }

  // Test 4: currentBill returns Standard at $15.99
  {
    const testDescription = 'currentBill returns Standard at $15.99';
    const bill = await streaming.currentBill();
    assert.strictEqual(bill.plan, 'Standard', 'Current plan should be Standard');
    assert.strictEqual(bill.monthlyCost, 15.99, 'Current bill should be $15.99');
    console.log(`✓ ${testDescription}`);
  }

  // Test 5: negotiate echoes angle and returns result object
  {
    const testDescription = 'negotiate echoes angle and returns result object';
    const angles = ['price_match', 'loyalty', 'complaint'];
    
    for (const angle of angles) {
      const result = await streaming.negotiate(null, angle);
      assert.strictEqual(result.angle, angle, `Angle should be "${angle}"`);
      assert.ok(typeof result.success === 'boolean', 'Result should have success boolean');
      assert.ok(typeof result.offeredMonthlyCost === 'number', 'Result should have offeredMonthlyCost number');
      assert.ok(typeof result.message === 'string', 'Result should have message string');
    }
    console.log(`✓ ${testDescription}`);
  }

  // Test 6: cancelFlowPreview has confirmed false and retention offer present
  {
    const testDescription = 'cancelFlowPreview has confirmed false and retention offer present';
    const result = await streaming.cancelFlowPreview();
    assert.strictEqual(result.confirmed, false, 'Cancellation should not be confirmed (R7: bluff-cancel only)');
    assert.ok(result.retentionOffer, 'Result should have retentionOffer');
    assert.ok(typeof result.retentionOffer.monthlyCost === 'number', 'Retention offer should have monthlyCost');
    assert.ok(Array.isArray(result.stepsTaken), 'Result should have stepsTaken array');
    console.log(`✓ ${testDescription}`);
  }

  // Test 7: validateConnector accepts the streaming connector
  {
    const testDescription = 'validateConnector accepts the streaming connector';
    const validation = validateConnector(streaming, 'streaming');
    assert.ok(validation.valid, `Connector should be valid, got: ${validation.message}`);
    console.log(`✓ ${testDescription}`);
  }

  // Test 8: listServices returns streaming service
  {
    const testDescription = 'listServices returns streaming service';
    const services = listServices();
    const streamingService = services.find(s => s.service === 'streaming');
    assert.ok(streamingService, 'Streaming service should be in list');
    assert.strictEqual(streamingService.connector, 'streaming', 'Streaming service should use streaming connector');
    console.log(`✓ ${testDescription}`);
  }

  // Test 9: getConnector returns streaming connector
  {
    const testDescription = 'getConnector returns streaming connector';
    const connector = getConnector('streaming');
    assert.strictEqual(connector, streaming, 'Should return the streaming connector module');
    console.log(`✓ ${testDescription}`);
  }

  // Test 10: getConnector returns error for unknown service
  {
    const testDescription = 'getConnector returns error for unknown service';
    const result = getConnector('unknown_service');
    assert.ok(result.error, 'Should return error for unknown service');
    assert.ok(typeof result.message === 'string', 'Should return human-readable message');
    console.log(`✓ ${testDescription}`);
  }

  // Test 11: validateConnector rejects connector missing methods
  {
    const testDescription = 'validateConnector rejects connector missing methods';
    const invalidConnector = {};
    const validation = validateConnector(invalidConnector, 'invalid');
    assert.strictEqual(validation.valid, false, 'Connector should be invalid');
    assert.ok(typeof validation.message === 'string', 'Should return error message');
    console.log(`✓ ${testDescription}`);
  }

  console.log('\nAll streaming connector tests passed!');
}

// Run tests
runTests().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
