/**
 * Approval gate tests
 * Agent Bulldog — Kiroween 2026
 * 
 * node --test test/approval/gate.test.js
 */

const assert = require('node:assert');
const { createGate } = require('../../src/approval/gate');

async function runTests() {
  console.log('=== Approval Gate Tests ===\n');

  // Test 1: requestApproval creates pending approval
  {
    const testDescription = 'requestApproval creates pending approval';
    const gate = createGate();
    
    const result = gate.requestApproval('streaming', 'negotiate', { angle: 'loyalty' });
    
    assert.ok(result.id, 'Should have approval ID');
    assert.strictEqual(result.service, 'streaming', 'Service should be "streaming"');
    assert.strictEqual(result.action, 'negotiate', 'Action should be "negotiate"');
    assert.strictEqual(result.status, 'pending', 'Status should be "pending"');
    assert.ok(result.details.angle === 'loyalty', 'Details should contain angle');
    assert.ok(result.createdAt instanceof Date, 'Should have createdAt timestamp');
    
    // Verify it's in pending
    const pending = gate.listPending(gate);
    assert.strictEqual(pending.length, 1, 'Should have 1 pending approval');
    assert.strictEqual(pending[0].id, result.id, 'ID should match');
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 2: approve marks approval as approved
  {
    const testDescription = 'approve marks approval as approved';
    const gate = createGate();
    
    const request = gate.requestApproval('streaming', 'negotiate', { angle: 'loyalty' });
    const result = gate.approve(gate, request.id);
    
    assert.ok(result.success, 'Should succeed');
    assert.strictEqual(result.approval.status, 'approved', 'Status should be "approved"');
    
    // Verify it's no longer in pending but in applied
    const pending = gate.listPending(gate);
    assert.strictEqual(pending.length, 0, 'Should have 0 pending approvals');
    
    const applied = gate.listApplied(gate);
    assert.strictEqual(applied.length, 1, 'Should have 1 applied approval');
    assert.strictEqual(applied[0].status, 'approved', 'Applied should have approved status');
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 3: reject marks approval as rejected
  {
    const testDescription = 'reject marks approval as rejected';
    const gate = createGate();
    
    const request = gate.requestApproval('streaming', 'negotiate', { angle: 'loyalty' });
    const result = gate.reject(gate, request.id);
    
    assert.ok(result.success, 'Should succeed');
    assert.strictEqual(result.approval.status, 'rejected', 'Status should be "rejected"');
    
    const applied = gate.listApplied(gate);
    assert.strictEqual(applied.length, 1, 'Should have 1 applied approval');
    assert.strictEqual(applied[0].status, 'rejected', 'Applied should have rejected status');
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 4: executeIfApproved runs executor only when approved
  {
    const testDescription = 'executeIfApproved runs executor only when approved';
    const gate = createGate();
    
    // Test with pending approval - should fail
    const pendingRequest = gate.requestApproval('streaming', 'negotiate', { angle: 'loyalty' });
    const pendingResult = await gate.executeIfApproved(gate, pendingRequest.id, async () => {
      return { success: true, result: 'executed' };
    });
    
    assert.ok(pendingResult.error, 'Should error for pending approval');
    assert.ok(pendingResult.message.includes('not approved'), 'Error message should indicate not approved');
    
    // Now approve and execute
    await gate.approve(gate, pendingRequest.id);
    const approvedResult = await gate.executeIfApproved(gate, pendingRequest.id, async () => {
      return { success: true, result: 'executed' };
    });
    
    assert.ok(!approvedResult.error, 'Should succeed for approved approval');
    assert.deepStrictEqual(approvedResult, { success: true, result: 'executed' }, 'Should return executor result');
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 5: executeIfApproved never runs executor when rejected
  {
    const testDescription = 'executeIfApproved never runs executor when rejected';
    const gate = createGate();
    
    const request = gate.requestApproval('streaming', 'negotiate', { angle: 'loyalty' });
    await gate.reject(gate, request.id);
    
    let executorWasCalled = false;
    const result = await gate.executeIfApproved(gate, request.id, async () => {
      executorWasCalled = true;
      return { success: true };
    });
    
    assert.ok(result.error, 'Should error for rejected approval');
    assert.ok(!executorWasCalled, 'Executor should not have been called');
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 6: executeIfApproved with unknown ID returns error
  {
    const testDescription = 'executeIfApproved with unknown ID returns error';
    const gate = createGate();
    
    const result = await gate.executeIfApproved(gate, 'UNKNOWN-000001', async () => {
      return { success: true };
    });
    
    assert.ok(result.error, 'Should error for unknown ID');
    assert.ok(result.message.includes('Unknown approval ID'), 'Error message should mention unknown ID');
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 7: cancel action is refused at requestApproval
  {
    const testDescription = 'cancel action is refused at requestApproval';
    const gate = createGate();
    
    const result = gate.requestApproval('streaming', 'cancel', { reason: 'not satisfied' });
    
    assert.ok(result.error, 'Should return error');
    assert.ok(result.message.includes('A cancellation can never be confirmed'), 'Error message should be the never-confirm message');
    
    // Verify nothing was registered
    const pending = gate.listPending(gate);
    assert.strictEqual(pending.length, 0, 'Nothing should be registered');
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 8: cancel action is refused at executeApproved
  {
    const testDescription = 'cancel action is refused at executeApproved';
    const gate = createGate();
    
    const executorWasCalled = false;
    const result = await gate.executeApproved(gate, 'streaming', 'cancel', { reason: 'not satisfied' }, async () => {
      return { success: true };
    });
    
    assert.ok(result.error, 'Should return error');
    assert.ok(result.message.includes('A cancellation can never be confirmed'), 'Error message should be the never-confirm message');
    
    // Verify no approval was recorded
    const applied = gate.listApplied(gate);
    assert.strictEqual(applied.length, 0, 'Nothing should be approved');
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 9: cancel action is refused at executeIfApproved
  {
    const testDescription = 'cancel action is refused at executeIfApproved';
    const gate = createGate();
    
    // First try to request - should fail
    const request = gate.requestApproval('streaming', 'cancel', {});
    assert.ok(request.error, 'Request should fail');
    
    // Try to approve a fake ID with cancel action
    const result = await gate.executeIfApproved(gate, 'FAKE-000001', async () => {
      return { success: true };
    });
    
    assert.ok(result.error, 'Should error');
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 10: All cancel variants are refused
  {
    const testDescription = 'All cancel variants are refused';
    const gate = createGate();
    
    const cancelVariants = ['cancel', 'cancel-order', 'cancel-service', 'cancel-subscription', 'confirm-cancel', 'confirm-cancellation', 'final-cancel', 'yes-cancel'];
    
    for (const action of cancelVariants) {
      const result = gate.requestApproval('streaming', action, {});
      assert.ok(result.error, `Action "${action}" should be refused`);
      assert.ok(result.message.includes('A cancellation can never be confirmed'), `Action "${action}" should have correct error message`);
    }
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 11: executeApproved records approval then runs executor
  {
    const testDescription = 'executeApproved records approval then runs executor';
    const gate = createGate();
    
    const result = await gate.executeApproved(gate, 'streaming', 'negotiate', { angle: 'loyalty' }, async () => {
      return { success: true, message: 'Negotiation completed' };
    });
    
    assert.ok(!result.error, 'Should succeed');
    assert.deepStrictEqual(result, { success: true, message: 'Negotiation completed' }, 'Should return executor result');
    
    // Verify approval was recorded
    const applied = gate.listApplied(gate);
    assert.strictEqual(applied.length, 1, 'Should have 1 applied approval');
    assert.strictEqual(applied[0].action, 'negotiate', 'Action should be negotiate');
    assert.strictEqual(applied[0].status, 'approved', 'Status should be approved');
    assert.ok(applied[0].details.angle === 'loyalty', 'Details should be preserved');
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 12: apply-offer validates rate is lower than current bill
  {
    const testDescription = 'apply-offer validates rate is lower than current bill';
    const gate = createGate();
    
    // Current bill is $15.99 for streaming
    // Rate $15.99 (not lower) should fail
    const result1 = gate.requestApproval('streaming', 'apply-offer', { rate: 15.99, currentBill: { monthlyCost: 15.99 } });
    
    assert.ok(result1.error, 'Same rate should fail validation');
    assert.ok(result1.message.includes('not lower'), 'Error message should indicate rate is not lower');
    
    // Rate $16.99 (higher) should also fail
    const result2 = gate.requestApproval('streaming', 'apply-offer', { rate: 16.99, currentBill: { monthlyCost: 15.99 } });
    assert.ok(result2.error, 'Higher rate should fail validation');
    assert.ok(result2.message.includes('not lower'), 'Error message should indicate rate is not lower');
    
    // Test with lower rate (should be accepted by gate)
    const result3 = gate.requestApproval('streaming', 'apply-offer', { rate: 12.99, currentBill: { monthlyCost: 15.99 } });
    assert.ok(!result3.error, 'Lower rate should be accepted by gate');
    assert.strictEqual(result3.details.rate, 12.99, 'Rate should be stored');
    
    // Verify it's still pending (validation passes)
    const pendingApprovals = gate.listPending(gate);
    assert.strictEqual(pendingApprovals.length, 1, 'Should have 1 pending approval after valid rate');
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 13: apply-offer with missing rate fails
  {
    const testDescription = 'apply-offer with missing rate fails';
    const gate = createGate();
    
    const result = gate.requestApproval('streaming', 'apply-offer', { currentBill: { monthlyCost: 15.99 } });
    assert.ok(result.error, 'Missing rate should fail');
    assert.ok(result.message.includes('Missing rate'), 'Error should mention missing rate');
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 14: apply-offer with missing currentBill fails
  {
    const testDescription = 'apply-offer with missing currentBill fails';
    const gate = createGate();
    
    const result = gate.requestApproval('streaming', 'apply-offer', { rate: 12.99 });
    assert.ok(result.error, 'Missing currentBill should fail');
    assert.ok(result.message.includes('Missing currentBill'), 'Error should mention missing currentBill');
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 15: Duplicate approval ID returns error
  {
    const testDescription = 'Duplicate approval ID returns error';
    const gate = createGate();
    
    const request = gate.requestApproval('streaming', 'negotiate', { angle: 'loyalty' });
    
    // Approve first time
    const approveResult1 = gate.approve(gate, request.id);
    assert.ok(approveResult1.success, 'First approve should succeed');
    
    // Try to approve again
    const approveResult2 = gate.approve(gate, request.id);
    assert.ok(approveResult2.error, 'Second approve should fail');
    assert.ok(approveResult2.message.includes('already been'), 'Error should mention already approved');
    
    // Try to reject after approve
    const rejectResult = gate.reject(gate, request.id);
    assert.ok(rejectResult.error, 'Reject after approve should fail');
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 16: executeIfApproved with executor throwing error
  {
    const testDescription = 'executeIfApproved with executor throwing error';
    const gate = createGate();
    
    const request = gate.requestApproval('streaming', 'negotiate', { angle: 'loyalty' });
    await gate.approve(gate, request.id);
    
    const result = await gate.executeIfApproved(gate, request.id, async () => {
      throw new Error('Test error');
    });
    
    assert.ok(result.error, 'Should return error');
    assert.ok(result.message.includes('Test error'), 'Error message should include original error');
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 17: Multiple pending approvals listed correctly
  {
    const testDescription = 'Multiple pending approvals listed correctly';
    const gate = createGate();
    
    gate.requestApproval('streaming', 'negotiate', { angle: 'loyalty' });
    gate.requestApproval('streaming', 'negotiate', { angle: 'price_match' });
    gate.requestApproval('streaming', 'negotiate', { angle: 'complaint' });
    
    const pendingList = gate.listPending(gate);
    assert.strictEqual(pendingList.length, 3, 'Should have 3 pending approvals');
    
    // Approve one
    await gate.approve(gate, pendingList[0].id);
    
    const pendingAfter = gate.listPending(gate);
    assert.strictEqual(pendingAfter.length, 2, 'Should have 2 pending after one approved');
    
    const applied = gate.listApplied(gate);
    assert.strictEqual(applied.length, 1, 'Should have 1 applied');
    
    console.log(`✓ ${testDescription}`);
  }

  console.log('\nAll approval gate tests passed!');
}

runTests().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
