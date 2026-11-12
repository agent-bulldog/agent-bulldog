/**
 * Price comparison indexer tests
 * Agent Bulldog — Kiroween 2026
 * 
 * node --test test/comparison/indexer.test.js
 */

const assert = require('node:assert/strict');
const { buildIndex, verifyLikeForLike, compareBill } = require('../../src/comparison/indexer');

// Main test function
async function runTests() {
  console.log('=== Indexer Tests ===\n');

  // Test 1: buildIndex returns complete structure with plans and industry prices
  {
    const testDescription = 'buildIndex returns complete structure with plans and industry prices';
    const result = await buildIndex('streaming');
    
    assert.strictEqual(result.service, 'streaming', 'Service should be "streaming"');
    assert.ok(result.currentBill, 'Should have currentBill');
    assert.ok(Array.isArray(result.plans), 'Should have plans array');
    assert.ok(Array.isArray(result.industryPrices), 'Should have industryPrices array');
    assert.ok(result.industryPrices.length > 0, 'Industry prices should not be empty');
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 2: buildIndex returns error for unknown service
  {
    const testDescription = 'buildIndex returns error for unknown service';
    const result = await buildIndex('unknown_service');
    
    assert.ok(result.error, 'Should return error for unknown service');
    assert.ok(typeof result.message === 'string', 'Should return human-readable message');
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 3: verifyLikeForLike returns true for matching streaming plans
  {
    const testDescription = 'verifyLikeForLike returns true for matching streaming plans';
    const current = { name: 'Standard', description: 'High definition, 2 screens' };
    const candidate = { name: 'Standard', description: 'High definition, 2 screens' };
    
    const result = verifyLikeForLike(candidate, current);
    assert.strictEqual(result, true, 'Should match like-for-like streaming plans');
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 4: verifyLikeForLike returns false for different plan tier
  {
    const testDescription = 'verifyLikeForLike returns false for different plan tier';
    const current = { name: 'Standard', description: 'High definition, 2 screens' };
    const candidate = { name: 'Basic', description: 'Standard definition, 1 screen' };
    
    const result = verifyLikeForLike(candidate, current);
    assert.strictEqual(result, false, 'Should not match different tiers');
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 5: verifyLikeForLike returns false for different description
  {
    const testDescription = 'verifyLikeForLike returns false for different description';
    const current = { name: 'Standard', description: 'High definition, 2 screens' };
    const candidate = { name: 'Standard', description: 'Standard definition, 1 screen' };
    
    const result = verifyLikeForLike(candidate, current);
    assert.strictEqual(result, false, 'Should not match different descriptions');
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 6: verifyLikeForLike works for insurance-like objects
  {
    const testDescription = 'verifyLikeForLike works for insurance-like objects';
    const current = {
      deductible: 1000,
      coverageLimits: 500000,
      insurerRating: 'A+'
    };
    const candidate = {
      deductible: 1000,
      coverageLimits: 500000,
      insurerRating: 'A+'
    };
    
    const result = verifyLikeForLike(candidate, current);
    assert.strictEqual(result, true, 'Should match like-for-like insurance policies');
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 7: verifyLikeForLike rejects insurance with different deductible
  {
    const testDescription = 'verifyLikeForLike rejects insurance with different deductible';
    const current = {
      deductible: 1000,
      coverageLimits: 500000,
      insurerRating: 'A+'
    };
    const candidate = {
      deductible: 500,
      coverageLimits: 500000,
      insurerRating: 'A+'
    };
    
    const result = verifyLikeForLike(candidate, current);
    assert.strictEqual(result, false, 'Should not match insurance with different deductible');
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 8: compareBill finds the $3.00/month saving for streaming
  {
    const testDescription = 'compareBill finds the $3.00/month saving for streaming';
    const result = await compareBill('streaming');
    
    assert.ok(!result.error, 'Should not be an error');
    assert.strictEqual(result.service, 'streaming', 'Service should be "streaming"');
    assert.strictEqual(result.currentPlan, 'Standard', 'Current plan should be Standard');
    assert.strictEqual(result.currentMonthlyCost, 15.99, 'Current cost should be $15.99');
    
    // Should find RivalStream Standard at $12.99 as best alternative
    assert.ok(result.bestAlternative, 'Should find a best alternative');
    assert.strictEqual(result.bestAlternative.service, 'RivalStream', 'Best alternative should be RivalStream');
    assert.strictEqual(result.bestAlternative.plan, 'Standard', 'Best alternative should be Standard plan');
    assert.strictEqual(result.bestMonthlyCost, 12.99, 'Best monthly cost should be $12.99');
    
    // Verify savings: $3.00/month, $36.00/year
    assert.strictEqual(result.monthlySavings, 3.00, 'Monthly savings should be $3.00');
    assert.strictEqual(result.annualSavings, 36.00, 'Annual savings should be $36.00');
    assert.strictEqual(result.likeForLike, true, 'Should be marked like-for-like');
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 9: compareBill rejects cheaper plan at different tier
  {
    const testDescription = 'compareBill rejects cheaper plan at different tier';
    // This is tested implicitly by Test 8 — Basic at $8.99 is cheaper but not like-for-like with Standard
    // The result should not choose Basic because it's not like-for-like with Standard
    
    const result = await compareBill('streaming');
    
    // Basic ($8.99) should NOT be selected as best alternative for Standard ($15.99) user
    if (result.bestAlternative) {
      assert.notStrictEqual(result.bestAlternative.plan, 'Basic', 'Should not select Basic for Standard user');
    }
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 10: compareBill returns zero savings with message when no cheaper plan exists
  {
    const testDescription = 'compareBill returns zero savings with message when no cheaper plan exists';
    const connectors = require('../../src/connectors/index');

    // Register a temporary mock connector whose only plan is already the cheapest
    connectors.connectorRegistry.bare = {
      listPlans: async () => [
        { name: 'Solo', monthlyCost: 9.99, description: 'Only plan' }
      ],
      currentBill: async () => ({ plan: 'Solo', monthlyCost: 9.99 })
    };

    try {
      const result = await compareBill('bare');

      assert.ok(!result.error, 'Should not be an error');
      assert.strictEqual(result.bestAlternative, null, 'Should find no alternative');
      assert.strictEqual(result.monthlySavings, 0, 'Monthly savings should be 0');
      assert.strictEqual(result.annualSavings, 0, 'Annual savings should be 0');
      assert.strictEqual(result.message, 'No cheaper like-for-like plan found', 'Should explain no savings');
    } finally {
      delete connectors.connectorRegistry.bare;
    }

    console.log(`✓ ${testDescription}`);
  }

  // Test 11: compareBill returns error object for unknown service
  {
    const testDescription = 'compareBill returns error object for unknown service';
    const result = await compareBill('unknown_service');
    
    assert.ok(result.error, 'Should return error for unknown service');
    assert.ok(typeof result.message === 'string', 'Should return human-readable message');
    assert.strictEqual(result.bestAlternative, undefined, 'Should not have bestAlternative on error');
    assert.strictEqual(result.monthlySavings, undefined, 'Should not have savings on error');
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 12: verifyLikeForLike rejects insurance missing required fields
  {
    const testDescription = 'verifyLikeForLike rejects insurance missing required fields';
    const current = {
      deductible: 1000,
      coverageLimits: 500000,
      insurerRating: 'A+'
    };
    const candidate = {
      deductible: 1000,
      coverageLimits: 500000
      // Missing insurerRating
    };
    
    const result = verifyLikeForLike(candidate, current);
    assert.strictEqual(result, false, 'Should not match insurance missing required fields');
    
    console.log(`✓ ${testDescription}`);
  }

  console.log('\nAll indexer tests passed!');
}

// Run tests
runTests().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
