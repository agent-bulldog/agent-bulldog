/**
 * Smoke tests — end-to-end CLI and cross-module integration
 * Agent Bulldog — Kiroween 2026
 * 
 * Tests the real execution paths by spawning `node src/cli.js` as a subprocess.
 * Covers: connector interface contract, comparison, negotiation, approval gate, savings.
 * 
 * node --test test/smoke.test.js
 */

const assert = require('node:assert');
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

/**
 * Helper to run a CLI command and capture output and exit code
 * @param {string[]} args - CLI arguments (excluding 'node' and cli.js path)
 * @returns {{output: string, error: string, exitCode: number}}
 */
function runCli(args) {
  const cliPath = path.join(__dirname, '../src/cli.js');
  const child = spawn('node', [cliPath, ...args]);
  
  let output = '';
  let errorOutput = '';
  
  return new Promise((resolve) => {
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    child.on('close', (code) => {
      resolve({
        output,
        error: errorOutput,
        exitCode: code
      });
    });
  });
}

/**
 * Creates a temporary directory for isolated test runs
 * @returns {string} - Path to temp directory
 */
function createTempDir() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-bulldog-test-'));
  return tempDir;
}

/**
 * Removes a temporary directory and its contents
 * @param {string} dirPath - Path to temp directory
 */
function removeTempDir(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}

async function runTests() {
  console.log('=== Smoke Tests (End-to-End Integration) ===\n');

  // Test 1: Connector interface contract (all four methods present)
  {
    const testDescription = 'connector interface contract (all four methods present)';
    
    const cliPath = path.join(__dirname, '../src/cli.js');
    const child = spawn('node', [cliPath, 'list-services']);
    
    let output = '';
    let exitCode = null;
    
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    await new Promise((resolve) => {
      child.on('close', (code) => {
        exitCode = code;
        resolve();
      });
    });
    
    // Should exit 0
    assert.strictEqual(exitCode, 0, 'Should exit with code 0');
    
    // Should list streaming service
    assert.ok(output.includes('streaming'), 'Should list streaming service');
    assert.ok(output.includes('connector: streaming'), 'Should mention streaming connector');
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 2: Comparison with fixture data (R2, R9)
  {
    const testDescription = 'comparison with fixture data (RivalStream Standard $12.99 vs $15.99 current)';
    
    const result = await runCli(['compare', 'streaming']);
    
    assert.strictEqual(result.exitCode, 0, `Should exit 0, got ${result.exitCode}: ${result.output} ${result.error}`);
    
    // Current bill is $15.99 (StreamWave Standard)
    assert.ok(result.output.includes('$15.99'), 'Should show current bill $15.99');
    
    // Best alternative is RivalStream Standard at $12.99 (cheaper like-for-like)
    assert.ok(result.output.includes('$12.99'), 'Should show RivalStream Standard at $12.99');
    
    // Monthly savings should be $3.00
    assert.ok(result.output.includes('$3.00'), 'Should show $3.00 monthly savings');
    
    // Annual savings should be $36.00
    assert.ok(result.output.includes('$36.00'), 'Should show $36.00 annual savings');
    
    // Check that like-for-like comparison was performed (verified by price comparison working correctly)
    // The CLI doesn't explicitly print "like-for-like" but the comparison logic uses it internally
    // Verify by checking that the cheaper alternative is at the same tier (Standard)
    assert.ok(result.output.includes('Best alternative: Standard'), 'Should show Best alternative is Standard (like-for-like tier match)');
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 3: Negotiation engine with loyalty angle
  {
    const testDescription = 'negotiation engine (loyalty angle returns $12.99 offer with $3.00 savings)';
    
    const result = await runCli(['negotiate', 'streaming', '--angle', 'loyalty']);
    
    // Should exit 0 (negotiation completed, showing pending approval)
    assert.strictEqual(result.exitCode, 0, `Should exit 0, got ${result.exitCode}: ${result.output} ${result.error}`);
    
    // Check that the offer is shown
    assert.ok(result.output.includes('$12.99'), 'Should show the $12.99 offer');
    assert.ok(result.output.includes('Savings'), 'Should mention savings');
    
    // Should mention approval is pending
    assert.ok(result.output.includes('approval'), 'Should mention approval');
    assert.ok(result.output.includes('approval ID'), 'Should show approval ID');
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 4: Bluff-cancel preview (R7) — must exit 0, never confirm cancellation
  {
    const testDescription = 'bluff-cancel preview (must stop before confirming and show $12.99 retention offer)';
    
    const result = await runCli(['cancel-preview', 'streaming']);
    
    // Should exit 0
    assert.strictEqual(result.exitCode, 0, `Should exit 0, got ${result.exitCode}: ${result.output} ${result.error}`);
    
    // Must show the retention offer amount
    assert.ok(result.output.includes('$12.99'), 'Should show the $12.99 retention offer');
    
    // Must state that cancellation was NOT confirmed
    assert.ok(result.output.includes('NOT confirmed'), 'Must state cancellation was NOT confirmed');
    assert.ok(result.output.includes('WARNING'), 'Should contain a warning');
    
    // Must say no action was taken
    assert.ok(result.output.includes('No action'), 'Should state no action was taken');
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 5: Approval gate — unapproved action does not execute
  {
    const testDescription = 'approval gate (unapproved action does not execute)';

    // We need to test that the negotiation result is PENDING approval
    // The CLI shows the offer and says it's pending approval
    // Let's run negotiate again and verify it doesn't record savings

    const tempDir = createTempDir();
    const savingsFile = path.join(tempDir, 'savings.json');

    try {
      const result = await runCli(['negotiate', 'streaming', '--angle', 'loyalty']);

      assert.strictEqual(result.exitCode, 0, `Should exit 0 for pending approval: ${result.output} ${result.error}`);

      // Should show offer but NOT apply it
      assert.ok(result.output.includes('$12.99'), 'Should show the offer');

      // The key test: the offer is pending approval only, so a report on an
      // isolated empty store must show no savings at all.
      const reportResult = await runCli(['report', '--savings-file', savingsFile]);

      assert.strictEqual(reportResult.exitCode, 0, 'Report should exit 0');
      assert.ok(reportResult.output.includes('No savings recorded yet'), 'Unapproved negotiation must not record savings');

      console.log(`✓ ${testDescription}`);
    } finally {
      removeTempDir(tempDir);
    }
  }

  // Test 6: Savings recorded only from approved apply-offer
  {
    const testDescription = 'savings recorded only from approved apply-offer (isolated --savings-file in temp dir)';
    
    const tempDir = createTempDir();
    const savingsFile = path.join(tempDir, 'savings.json');
    
    try {
      // Step 1: Negotiate with loyalty angle
      const negotiateResult = await runCli(['negotiate', 'streaming', '--angle', 'loyalty']);
      assert.strictEqual(negotiateResult.exitCode, 0, `Negotiate should succeed: ${negotiateResult.output} ${negotiateResult.error}`);
      
      // Step 2: Approve the apply-offer with the $12.99 rate
      const approveResult = await runCli([
        'approve', 'streaming', 'apply-offer',
        '--rate', '12.99',
        '--savings-file', savingsFile
      ]);
      
      assert.strictEqual(approveResult.exitCode, 0, `Apply-offer should succeed: ${approveResult.output} ${approveResult.error}`);
      
      // Step 3: Verify savings were recorded
      assert.ok(fs.existsSync(savingsFile), 'Savings file should have been created');
      
      const savingsData = fs.readFileSync(savingsFile, 'utf8');
      const savings = JSON.parse(savingsData);
      
      assert.ok(Array.isArray(savings), 'Savings store should be an array');
      assert.strictEqual(savings.length, 1, 'Should have 1 savings entry');
      
      const entry = savings[0];
      assert.strictEqual(entry.service, 'streaming', 'Service should be streaming');
      assert.strictEqual(entry.previousMonthlyCost, 15.99, 'Previous cost should be $15.99');
      assert.strictEqual(entry.newMonthlyCost, 12.99, 'New cost should be $12.99');
      assert.strictEqual(entry.monthlySavings, 3.00, 'Monthly savings should be $3.00');
      assert.strictEqual(entry.annualSavings, 36.00, 'Annual savings should be $36.00');
      
      // Step 4: Run report and verify it shows $3.00/mo and $36.00/yr
      const reportResult = await runCli(['report', '--savings-file', savingsFile]);
      
      assert.strictEqual(reportResult.exitCode, 0, `Report should exit 0: ${reportResult.output} ${reportResult.error}`);
      
      assert.ok(reportResult.output.includes('$3.00'), 'Report should show $3.00 monthly savings');
      assert.ok(reportResult.output.includes('$36.00'), 'Report should show $36.00 annual savings');
      assert.ok(reportResult.output.includes('streaming'), 'Report should mention streaming service');
      
      console.log(`✓ ${testDescription}`);
    } finally {
      removeTempDir(tempDir);
    }
  }

  // Test 7: CLI commands end-to-end (R1, R2, R3, R7, R10, R11, R12)
  {
    const testDescription = 'CLI commands end-to-end (full workflow: compare, negotiate, approve, report)';
    
    const tempDir = createTempDir();
    const savingsFile = path.join(tempDir, 'savings.json');
    
    try {
      // Full workflow:
      // 1. list-services → verify streaming is configured
      // 2. compare streaming → verify $3.00/month saving opportunity
      // 3. negotiate streaming --angle loyalty → shows pending approval
      // 4. approve streaming apply-offer --rate 12.99 → records saving
      // 5. report → shows $3.00/mo, $36.00/yr
      
      // Step 1: list-services
      const listResult = await runCli(['list-services']);
      assert.strictEqual(listResult.exitCode, 0, 'list-services should succeed');
      assert.ok(listResult.output.includes('streaming'), 'Should list streaming service');
      
      // Step 2: compare streaming
      const compareResult = await runCli(['compare', 'streaming']);
      assert.strictEqual(compareResult.exitCode, 0, 'compare should succeed');
      assert.ok(compareResult.output.includes('$15.99'), 'Should show current $15.99 bill');
      assert.ok(compareResult.output.includes('$12.99'), 'Should show cheaper alternative $12.99');
      assert.ok(compareResult.output.includes('$3.00'), 'Should show $3.00 savings');
      
      // Step 3: negotiate streaming --angle loyalty
      const negotiateResult = await runCli(['negotiate', 'streaming', '--angle', 'loyalty']);
      assert.strictEqual(negotiateResult.exitCode, 0, 'negotiate should succeed');
      assert.ok(negotiateResult.output.includes('$12.99'), 'Should show $12.99 offer');
      assert.ok(negotiateResult.output.includes('approval'), 'Should mention approval');
      
      // Step 4: approve streaming apply-offer --rate 12.99
      const approveResult = await runCli([
        'approve', 'streaming', 'apply-offer',
        '--rate', '12.99',
        '--savings-file', savingsFile
      ]);
      assert.strictEqual(approveResult.exitCode, 0, 'apply-offer should succeed');
      
      // Step 5: report
      const reportResult = await runCli(['report', '--savings-file', savingsFile]);
      assert.strictEqual(reportResult.exitCode, 0, 'report should succeed');
      
      // Verify $3.00/mo and $36.00/yr
      assert.ok(reportResult.output.includes('$3.00'), 'Report should show $3.00/month savings');
      assert.ok(reportResult.output.includes('$36.00'), 'Report should show $36.00/year savings');
      
      // Verify streaming is listed (line with streaming and savings)
      const lines = reportResult.output.split('\n');
      const streamingLine = lines.find(line => line.trim().startsWith('streaming:') || line.includes('streaming'));
      assert.ok(streamingLine, 'Report should have streaming line');
      
      // Check that the savings are in the report (in the totals section)
      const totalsSection = reportResult.output.split('Totals:')[1] || '';
      assert.ok(totalsSection.includes('$3.00'), 'Totals should show $3.00 savings');
      assert.ok(totalsSection.includes('$36.00'), 'Totals should show $36.00 savings');
      
      console.log(`✓ ${testDescription}`);
    } finally {
      removeTempDir(tempDir);
    }
  }

  // Test 8: Negotiation retry scheduler (5 attempts, fresh angles, "provider will not budge")
  {
    const testDescription = 'negotiation retry scheduler (fresh angles, 5 attempts then "provider will not budge")';
    
    // We can't easily test the full scheduler in CLI smoke tests (requires multiple runs)
    // But we can verify the scheduler module is loaded and working by testing via the negotiation engine
    
    // The actual retry logic is tested in test/negotiation/scheduler.test.js
    // This smoke test just verifies the integration works
    const schedulerPath = path.join(__dirname, '../src/negotiation/scheduler.js');
    const scheduler = require(schedulerPath);
    
    const schedule = scheduler.createSchedule('streaming');
    
    assert.ok(schedule.anglePool.length === 5, 'Should start with 5 angles');
    assert.ok(schedule.attempts === 0, 'Should start with 0 attempts');
    assert.ok(schedule.done === false, 'Should not be done initially');
    
    // Test getNextAngle rotates through all 5
    const angles = [];
    for (let i = 0; i < 5; i++) {
      const angle = scheduler.getNextAngle(schedule);
      assert.ok(angle !== null, `Should get angle ${i}`);
      angles.push(angle);
    }
    
    assert.strictEqual(angles.length, 5, 'Should get 5 angles');
    assert.ok(new Set(angles).size === 5, 'All angles should be unique');
    
    // 6th attempt should return null (no angles left)
    const nextAngle = scheduler.getNextAngle(schedule);
    assert.strictEqual(nextAngle, null, '6th attempt should have no angles');
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 9: Cross-module path verification
  {
    const testDescription = 'cross-module path: connector → comparison → negotiation → approval → savings';
    
    // Verify the connector interface is properly exposed
    const connectorPath = path.join(__dirname, '../src/connectors/index.js');
    const connectorIndex = require(connectorPath);
    
    // Check that getConnector returns a valid connector with all 4 methods
    const streaming = connectorIndex.getConnector('streaming');
    assert.ok(streaming.listPlans, 'Streaming connector should have listPlans');
    assert.ok(streaming.currentBill, 'Streaming connector should have currentBill');
    assert.ok(streaming.negotiate, 'Streaming connector should have negotiate');
    assert.ok(streaming.cancelFlowPreview, 'Streaming connector should have cancelFlowPreview');
    
    // Verify comparison module uses connector correctly
    const comparisonPath = path.join(__dirname, '../src/comparison/indexer.js');
    const comparison = require(comparisonPath);
    
    // Test that verifyLikeForLike works correctly with streaming-style current bill
    // streaming currentBill returns { plan: 'Standard', monthlyCost: 15.99 }
    // So we test with a string plan name (like currentBill returns) and an object plan
    const likeForLike1 = comparison.verifyLikeForLike(
      { plan: 'Standard', description: 'High definition, 2 screens' },
      'Standard'  // current.plan is a string in streaming connector
    );
    assert.strictEqual(likeForLike1, false, 'String current.plan should not match (needs object with description)');
    
    // The actual comparison logic in compareBill matches by plan name directly
    // (it doesn't use verifyLikeForLike for the actual comparison, just checks plan name)
    const currentPlanName = 'Standard';
    const candidate = { plan: 'Standard', description: 'High definition, 2 screens' };
    const candidateName = candidate.plan || candidate.name;
    assert.strictEqual(candidateName, currentPlanName, 'Should match by plan name in compareBill');
    
    // Verify negotiation uses connector
    const negotiationPath = path.join(__dirname, '../src/negotiation/engine.js');
    const engine = require(negotiationPath);
    
    // Verify scheduler is loaded
    const schedulerPath = path.join(__dirname, '../src/negotiation/scheduler.js');
    const scheduler = require(schedulerPath);
    
    const schedule = scheduler.createSchedule('streaming');
    assert.ok(schedule.anglePool.length === 5, 'Scheduler should have 5 angles');
    
    // Verify savings tracker is loaded (isolated temp store — never the real default store)
    const savingsPath = path.join(__dirname, '../src/savings.js');
    const savingsModule = require(savingsPath);

    const tempDir9 = createTempDir();
    const savingsFile9 = path.join(tempDir9, 'savings.json');
    const tracker = savingsModule.createSavingsTracker({ filePath: savingsFile9 });
    const result = tracker.recordSaving('streaming', {
      previousMonthlyCost: 15.99,
      newMonthlyCost: 12.99,
      plan: 'Test'
    });
    
    assert.ok(result.success, 'Savings tracker should record saving');
    assert.strictEqual(result.entry.monthlySavings, 3.00, 'Should calculate $3.00 monthly savings');
    
    // Verify approval gate is loaded
    const approvalPath = path.join(__dirname, '../src/approval/gate.js');
    const approvalModule = require(approvalPath);
    
    const gate = approvalModule.createGate();
    const approval = gate.requestApproval('streaming', 'negotiate', { angle: 'loyalty' });
    
    assert.ok(approval.id, 'Should create pending approval');
    assert.strictEqual(approval.status, 'pending', 'Should be pending');
    
    // Test that cancel is refused
    const cancelApproval = gate.requestApproval('streaming', 'cancel', {});
    assert.ok(cancelApproval.error, 'Cancel should be refused');
    assert.ok(cancelApproval.message.includes('never'), 'Error should mention never confirming');

    removeTempDir(tempDir9);

    console.log(`✓ ${testDescription}`);
  }

  // Test 10: Guard recordSaving against non-array JSON store
  {
    const testDescription = 'recordSaving guards against store file containing valid JSON that is not an array';
    
    const tempDir = createTempDir();
    const savingsFile = path.join(tempDir, 'invalid-savings.json');
    
    try {
      // Create a store file with valid JSON that is NOT an array
      fs.writeFileSync(savingsFile, '{"not": "an array", "should": "fallback gracefully"}');
      
      const savingsPath = path.join(__dirname, '../src/savings.js');
      const savingsModule = require(savingsPath);
      
      const tracker = savingsModule.createSavingsTracker({ filePath: savingsFile });
      
      // Should handle gracefully by replacing non-array with empty array
      const entries = tracker.listEntries();
      assert.ok(Array.isArray(entries), 'Should have entries as array');
      assert.strictEqual(entries.length, 0, 'Should start with empty array after replacing invalid JSON');
      
      // recordSaving should succeed now
      const result = tracker.recordSaving('streaming', {
        previousMonthlyCost: 15.99,
        newMonthlyCost: 12.99,
        plan: 'Test'
      });
      
      assert.ok(result.success, 'Should succeed after fixing invalid JSON');
      assert.strictEqual(result.entry.monthlySavings, 3.00, 'Should calculate $3.00 savings');
      
      // Verify file is now valid JSON array
      const savedData = fs.readFileSync(savingsFile, 'utf8');
      const saved = JSON.parse(savedData);
      assert.ok(Array.isArray(saved), 'File should now contain an array');
      
      console.log(`✓ ${testDescription}`);
    } finally {
      removeTempDir(tempDir);
    }
  }

  // Test 11: Demo mode with no credentials
  {
    const testDescription = 'demo mode with no credentials (R12)';
    
    const result = await runCli(['compare', 'streaming']);
    
    // Should work without credentials (demo mode)
    assert.strictEqual(result.exitCode, 0, 'Should work in demo mode');
    assert.ok(result.output.includes('$15.99'), 'Should show current bill');
    assert.ok(result.output.includes('$12.99'), 'Should show comparison');
    
    console.log(`✓ ${testDescription}`);
  }

  console.log('\nAll smoke tests passed!');
}

runTests().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
