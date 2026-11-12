/**
 * Savings tracker tests
 * Agent Bulldog — Kiroween 2026
 * 
 * node --test test/savings/savings.test.js
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { createSavingsTracker, DEFAULT_STORE_PATH } = require('../../src/savings');

async function runTests() {
  console.log('=== Savings Tracker Tests ===\n');

  // Test 1: Recording a saving
  {
    const testDescription = 'Recording a saving';
    const tempFile = path.join(__dirname, 'temp-savings-1.json');
    
    // Clean up if exists
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }

    const tracker = createSavingsTracker({ filePath: tempFile });

    const result = tracker.recordSaving('streaming', {
      previousMonthlyCost: 15.99,
      newMonthlyCost: 12.99,
      plan: 'StreamWave Standard',
      approvalId: 'APP-000001'
    });

    assert.ok(result.success, 'Should succeed');
    assert.ok(result.entry.id, 'Entry should have an ID');
    assert.strictEqual(result.entry.service, 'streaming', 'Service should be streaming');
    assert.strictEqual(result.entry.previousMonthlyCost, 15.99, 'Previous cost should be 15.99');
    assert.strictEqual(result.entry.newMonthlyCost, 12.99, 'New cost should be 12.99');
    assert.strictEqual(result.entry.monthlySavings, 3.00, 'Monthly savings should be 3.00');
    assert.strictEqual(result.entry.annualSavings, 36.00, 'Annual savings should be 36.00');
    assert.strictEqual(result.entry.plan, 'StreamWave Standard', 'Plan should be StreamWave Standard');
    assert.strictEqual(result.entry.approvalId, 'APP-000001', 'Approval ID should be APP-000001');
    assert.ok(result.entry.createdAt, 'Entry should have createdAt timestamp');

    // Clean up
    fs.unlinkSync(tempFile);

    console.log(`✓ ${testDescription}`);
  }

  // Test 2: Money rounding to 2 decimals
  {
    const testDescription = 'Money rounding to 2 decimals';
    const tempFile = path.join(__dirname, 'temp-savings-2.json');
    
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }

    const tracker = createSavingsTracker({ filePath: tempFile });

    const result = tracker.recordSaving('streaming', {
      previousMonthlyCost: 15.333,
      newMonthlyCost: 12.111,
      plan: 'Test Plan'
    });

    assert.ok(result.success, 'Should succeed');
    assert.strictEqual(result.entry.previousMonthlyCost, 15.33, 'Previous cost should be rounded to 15.33');
    assert.strictEqual(result.entry.newMonthlyCost, 12.11, 'New cost should be rounded to 12.11');
    assert.strictEqual(result.entry.monthlySavings, 3.22, 'Monthly savings should be 3.22 (rounded)');

    fs.unlinkSync(tempFile);

    console.log(`✓ ${testDescription}`);
  }

  // Test 3: Per-service and total aggregation
  {
    const testDescription = 'Per-service and total aggregation';
    const tempFile = path.join(__dirname, 'temp-savings-3.json');
    
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }

    const tracker = createSavingsTracker({ filePath: tempFile });

    // Record first saving (streaming)
    tracker.recordSaving('streaming', {
      previousMonthlyCost: 15.99,
      newMonthlyCost: 12.99,
      plan: 'StreamWave Standard'
    });

    // Record second saving (streaming)
    tracker.recordSaving('streaming', {
      previousMonthlyCost: 12.99,
      newMonthlyCost: 11.99,
      plan: 'StreamWave Basic'
    });

    // Record third saving (phone)
    tracker.recordSaving('phone', {
      previousMonthlyCost: 55.00,
      newMonthlyCost: 45.00,
      plan: 'Phone Basic'
    });

    const report = tracker.getReport();

    // Check streaming totals
    assert.ok(report.byService.streaming, 'Should have streaming in byService');
    assert.strictEqual(report.byService.streaming.monthlySavings, 4.00, 'Streaming monthly savings should be 4.00');
    assert.strictEqual(report.byService.streaming.annualSavings, 48.00, 'Streaming annual savings should be 48.00');
    assert.strictEqual(report.byService.streaming.count, 2, 'Streaming should have 2 offers');

    // Check phone totals
    assert.ok(report.byService.phone, 'Should have phone in byService');
    assert.strictEqual(report.byService.phone.monthlySavings, 10.00, 'Phone monthly savings should be 10.00');
    assert.strictEqual(report.byService.phone.annualSavings, 120.00, 'Phone annual savings should be 120.00');
    assert.strictEqual(report.byService.phone.count, 1, 'Phone should have 1 offer');

    // Check totals
    assert.strictEqual(report.totals.monthlySavings, 14.00, 'Total monthly savings should be 14.00');
    assert.strictEqual(report.totals.annualSavings, 168.00, 'Total annual savings should be 168.00');
    assert.strictEqual(report.totals.serviceCount, 2, 'Should have 2 services');

    fs.unlinkSync(tempFile);

    console.log(`✓ ${testDescription}`);
  }

  // Test 4: Rejection of non-lower rate
  {
    const testDescription = 'Rejection of non-lower rate';
    const tempFile = path.join(__dirname, 'temp-savings-4.json');
    
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }

    const tracker = createSavingsTracker({ filePath: tempFile });

    // Same rate (not lower)
    const result1 = tracker.recordSaving('streaming', {
      previousMonthlyCost: 15.99,
      newMonthlyCost: 15.99,
      plan: 'Same Rate'
    });

    assert.ok(result1.error, 'Same rate should fail');
    assert.ok(result1.message.includes('not lower'), 'Error message should indicate rate is not lower');

    // Higher rate
    const result2 = tracker.recordSaving('streaming', {
      previousMonthlyCost: 15.99,
      newMonthlyCost: 17.99,
      plan: 'Higher Rate'
    });

    assert.ok(result2.error, 'Higher rate should fail');
    assert.ok(result2.message.includes('not lower'), 'Error message should indicate rate is not lower');

    // Clean up temp file
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }

    console.log(`✓ ${testDescription}`);
  }

  // Test 5: Rejection of missing fields
  {
    const testDescription = 'Rejection of missing fields';
    const tempFile = path.join(__dirname, 'temp-savings-5.json');
    
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }

    const tracker = createSavingsTracker({ filePath: tempFile });

    // Missing service
    const result1 = tracker.recordSaving('', {
      previousMonthlyCost: 15.99,
      newMonthlyCost: 12.99,
      plan: 'Test'
    });
    assert.ok(result1.error, 'Empty service should fail');
    assert.ok(result1.message.includes('Missing service'), 'Error should mention missing service');

    // Missing previousMonthlyCost
    const result2 = tracker.recordSaving('streaming', {
      newMonthlyCost: 12.99,
      plan: 'Test'
    });
    assert.ok(result2.error, 'Missing previousMonthlyCost should fail');
    assert.ok(result2.message.includes('Missing previousMonthlyCost'), 'Error should mention missing previousMonthlyCost');

    // Missing newMonthlyCost
    const result3 = tracker.recordSaving('streaming', {
      previousMonthlyCost: 15.99,
      plan: 'Test'
    });
    assert.ok(result3.error, 'Missing newMonthlyCost should fail');
    assert.ok(result3.message.includes('Missing newMonthlyCost'), 'Error should mention missing newMonthlyCost');

    // Invalid numeric values
    const result4 = tracker.recordSaving('streaming', {
      previousMonthlyCost: 'not-a-number',
      newMonthlyCost: 12.99,
      plan: 'Test'
    });
    assert.ok(result4.error, 'Invalid previousMonthlyCost should fail');
    assert.ok(result4.message.includes('Invalid previousMonthlyCost'), 'Error should mention invalid previousMonthlyCost');

    // Missing plan
    const result5 = tracker.recordSaving('streaming', {
      previousMonthlyCost: 15.99,
      newMonthlyCost: 12.99
    });
    assert.ok(result5.error, 'Missing plan should fail');
    assert.ok(result5.message.includes('Missing plan'), 'Error should mention missing plan');

    // Clean up temp file
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }

    console.log(`✓ ${testDescription}`);
  }

  // Test 6: Persistence across two tracker instances
  {
    const testDescription = 'Persistence across two tracker instances';
    const tempFile = path.join(__dirname, 'temp-savings-6.json');
    
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }

    // First instance
    const tracker1 = createSavingsTracker({ filePath: tempFile });
    tracker1.recordSaving('streaming', {
      previousMonthlyCost: 15.99,
      newMonthlyCost: 12.99,
      plan: 'StreamWave Standard'
    });

    // Second instance (reading from same file)
    const tracker2 = createSavingsTracker({ filePath: tempFile });
    
    const entries = tracker2.listEntries();
    assert.strictEqual(entries.length, 1, 'Should have 1 entry after second instance loads');
    assert.strictEqual(entries[0].service, 'streaming', 'Service should be streaming');
    assert.strictEqual(entries[0].monthlySavings, 3.00, 'Monthly savings should be 3.00');

    // Add another entry via second instance
    tracker2.recordSaving('phone', {
      previousMonthlyCost: 55.00,
      newMonthlyCost: 45.00,
      plan: 'Phone Basic'
    });

    // First instance needs to reload from disk to see new entries
    const tracker1Reloaded = createSavingsTracker({ filePath: tempFile });
    const entriesAfter = tracker1Reloaded.listEntries();
    assert.strictEqual(entriesAfter.length, 2, 'Should see 2 entries after reloading from disk');
    assert.strictEqual(entriesAfter[0].service, 'streaming', 'First entry should be streaming');
    assert.strictEqual(entriesAfter[1].service, 'phone', 'Second entry should be phone');

    // Clean up
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }

    console.log(`✓ ${testDescription}`);
  }

  // Test 7: Empty report case
  {
    const testDescription = 'Empty report case';
    const tempFile = path.join(__dirname, 'temp-savings-7.json');
    
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }

    const tracker = createSavingsTracker({ filePath: tempFile });
    const report = tracker.getReport();

    assert.strictEqual(report.totals.monthlySavings, 0, 'Monthly savings should be 0');
    assert.strictEqual(report.totals.annualSavings, 0, 'Annual savings should be 0');
    assert.strictEqual(report.totals.serviceCount, 0, 'Service count should be 0');
    assert.deepStrictEqual(report.byService, {}, 'byService should be empty');

    // Clean up
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }

    console.log(`✓ ${testDescription}`);
  }

  // Test 8: Clear function
  {
    const testDescription = 'Clear function';
    const tempFile = path.join(__dirname, 'temp-savings-8.json');
    
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }

    const tracker = createSavingsTracker({ filePath: tempFile });
    
    tracker.recordSaving('streaming', {
      previousMonthlyCost: 15.99,
      newMonthlyCost: 12.99,
      plan: 'StreamWave Standard'
    });

    assert.strictEqual(tracker.listEntries().length, 1, 'Should have 1 entry');

    tracker.clear();

    assert.strictEqual(tracker.listEntries().length, 0, 'Should have 0 entries after clear');
    const reportAfterClear = tracker.getReport();
    assert.strictEqual(reportAfterClear.totals.monthlySavings, 0, 'Monthly savings should be 0 after clear');

    fs.unlinkSync(tempFile);

    console.log(`✓ ${testDescription}`);
  }

  // Test 9: Demo flow (StreamWave Standard $15.99 -> $12.99 = $3.00/month, $36.00/year)
  {
    const testDescription = 'Demo flow (StreamWave Standard $15.99 -> $12.99 = $3.00/month, $36.00/year)';
    const tempFile = path.join(__dirname, 'temp-savings-9.json');
    
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }

    const tracker = createSavingsTracker({ filePath: tempFile });

    const result = tracker.recordSaving('streaming', {
      previousMonthlyCost: 15.99,
      newMonthlyCost: 12.99,
      plan: 'StreamWave Standard'
    });

    assert.ok(result.success, 'Should succeed');
    assert.strictEqual(result.entry.monthlySavings, 3.00, 'Monthly savings should be $3.00');
    assert.strictEqual(result.entry.annualSavings, 36.00, 'Annual savings should be $36.00');

    const report = tracker.getReport();
    assert.strictEqual(report.totals.monthlySavings, 3.00, 'Total monthly savings should be $3.00');
    assert.strictEqual(report.totals.annualSavings, 36.00, 'Total annual savings should be $36.00');

    fs.unlinkSync(tempFile);

    console.log(`✓ ${testDescription}`);
  }

  console.log('\nAll savings tracker tests passed!');
}

runTests().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
