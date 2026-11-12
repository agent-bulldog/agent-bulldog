/**
 * CLI approval tests
 * Agent Bulldog — Kiroween 2026
 * 
 * node --test test/cli/approval.test.js
 */

const assert = require('node:assert');
const { spawn } = require('node:child_process');
const path = require('node:path');

async function runTests() {
  console.log('=== CLI Approval Tests ===\n');

  const cliPath = path.join(__dirname, '../../src/cli.js');

  // Test 1: list-services lists streaming
  {
    const testDescription = 'list-services lists streaming';
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
    
    assert.strictEqual(exitCode, 0, 'Should exit with code 0');
    assert.ok(output.includes('streaming'), 'Output should contain streaming');
    assert.ok(output.includes('connector'), 'Output should mention connector');
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 2: compare streaming shows 3.00 per month and 36.00 per year savings
  {
    const testDescription = 'compare streaming shows savings';
    const child = spawn('node', [cliPath, 'compare', 'streaming']);
    
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
    
    assert.strictEqual(exitCode, 0, 'Should exit with code 0');
    assert.ok(output.includes('3.00'), 'Output should show $3.00 monthly savings');
    assert.ok(output.includes('36.00'), 'Output should show $36.00 annual savings');
    assert.ok(output.includes('Standard'), 'Output should show current plan');
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 3: negotiate streaming --angle loyalty shows 12.99 offer plus pending approval ID
  {
    const testDescription = 'negotiate streaming --angle loyalty shows offer and approval ID';
    const child = spawn('node', [cliPath, 'negotiate', 'streaming', '--angle', 'loyalty']);
    
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
    
    assert.strictEqual(exitCode, 0, 'Should exit with code 0');
    assert.ok(output.includes('12.99'), 'Output should show $12.99 offer');
    assert.ok(output.includes('Pending approval ID'), 'Output should mention pending approval ID');
    assert.ok(output.includes('APP-'), 'Output should show approval ID format');
    
    // Extract approval ID for use in subsequent tests
    const approvalMatch = output.match(/APP-\d+/);
    if (approvalMatch) {
      global.lastApprovalId = approvalMatch[0];
    }
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 4: approve streaming negotiate --angle loyalty succeeds
  {
    const testDescription = 'approve streaming negotiate --angle loyalty succeeds';
    const child = spawn('node', [cliPath, 'approve', 'streaming', 'negotiate', '--angle', 'loyalty']);
    
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
    
    assert.strictEqual(exitCode, 0, 'Should exit with code 0');
    assert.ok(output.includes('Offer:'), 'Output should show offer');
    assert.ok(output.includes('12.99'), 'Output should show $12.99');
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 5: approve streaming apply-offer --rate 12.99 succeeds
  {
    const testDescription = 'approve streaming apply-offer --rate 12.99 succeeds';
    const child = spawn('node', [cliPath, 'approve', 'streaming', 'apply-offer', '--rate', '12.99']);
    
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
    
    assert.strictEqual(exitCode, 0, 'Should exit with code 0');
    assert.ok(output.includes('Offer Applied'), 'Output should show offer applied');
    assert.ok(output.includes('12.99'), 'Output should show new rate $12.99');
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 6: approve streaming cancel is refused with exit 1 and never-confirm message
  {
    const testDescription = 'approve streaming cancel is refused';
    const child = spawn('node', [cliPath, 'approve', 'streaming', 'cancel']);
    
    let output = '';
    let exitCode = null;
    
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      output += data.toString();
    });
    
    await new Promise((resolve) => {
      child.on('close', (code) => {
        exitCode = code;
        resolve();
      });
    });
    
    assert.strictEqual(exitCode, 1, 'Should exit with code 1');
    assert.ok(output.includes('A cancellation can never be confirmed'), 'Output should show never-confirm message');
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 7: approve streaming cancel-variant is also refused
  {
    const testDescription = 'approve streaming cancel-subscription is refused';
    const child = spawn('node', [cliPath, 'approve', 'streaming', 'cancel-subscription']);
    
    let output = '';
    let exitCode = null;
    
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      output += data.toString();
    });
    
    await new Promise((resolve) => {
      child.on('close', (code) => {
        exitCode = code;
        resolve();
      });
    });
    
    assert.strictEqual(exitCode, 1, 'Should exit with code 1');
    assert.ok(output.includes('A cancellation can never be confirmed'), 'Output should show never-confirm message');
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 8: approve with unknown action exits 1
  {
    const testDescription = 'approve with unknown action exits 1';
    const child = spawn('node', [cliPath, 'approve', 'streaming', 'unknown-action']);
    
    let output = '';
    let exitCode = null;
    
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      output += data.toString();
    });
    
    await new Promise((resolve) => {
      child.on('close', (code) => {
        exitCode = code;
        resolve();
      });
    });
    
    assert.strictEqual(exitCode, 1, 'Should exit with code 1');
    assert.ok(output.includes('Error'), 'Output should contain Error');
    assert.ok(output.includes('unknown'), 'Output should mention unknown action');
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 9: report exits 1 with not-yet-available message
  {
    const testDescription = 'report exits 1 with not-yet-available message';
    const child = spawn('node', [cliPath, 'report']);
    
    let output = '';
    let exitCode = null;
    
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      output += data.toString();
    });
    
    await new Promise((resolve) => {
      child.on('close', (code) => {
        exitCode = code;
        resolve();
      });
    });
    
    assert.strictEqual(exitCode, 1, 'Should exit with code 1');
    assert.ok(output.includes('not yet available'), 'Output should mention not yet available');
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 10: Error outputs contain no stack traces
  {
    const testDescription = 'Error outputs contain no stack traces';
    const child = spawn('node', [cliPath, 'unknown-command-xyz']);
    
    let output = '';
    let exitCode = null;
    
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      output += data.toString();
    });
    
    await new Promise((resolve) => {
      child.on('close', (code) => {
        exitCode = code;
        resolve();
      });
    });
    
    assert.strictEqual(exitCode, 1, 'Should exit with code 1');
    
    // Check that there's no stack trace (no "at " frames from function calls)
    const combinedOutput = output;
    assert.ok(!combinedOutput.includes('    at '), 'Should not contain stack trace (no "at " frames)');
    assert.ok(!combinedOutput.includes('TypeError'), 'Should not contain TypeError');
    assert.ok(combinedOutput.includes('Error:'), 'Should contain Error but in user-friendly format');
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 11: Unknown service returns error without stack trace
  {
    const testDescription = 'Unknown service returns error without stack trace';
    const child = spawn('node', [cliPath, 'compare', 'unknown_service_xyz']);
    
    let output = '';
    let exitCode = null;
    
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      output += data.toString();
    });
    
    await new Promise((resolve) => {
      child.on('close', (code) => {
        exitCode = code;
        resolve();
      });
    });
    
    assert.strictEqual(exitCode, 1, 'Should exit with code 1');
    
    const combinedOutput = output;
    assert.ok(combinedOutput.includes('Unknown service'), 'Output should mention unknown service');
    assert.ok(!combinedOutput.includes('    at '), 'Should not contain stack trace');
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 12: apply-offer with rate not lower than current bill fails
  {
    const testDescription = 'apply-offer with non-lower rate fails';
    const child = spawn('node', [cliPath, 'approve', 'streaming', 'apply-offer', '--rate', '15.99']);
    
    let output = '';
    let exitCode = null;
    
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      output += data.toString();
    });
    
    await new Promise((resolve) => {
      child.on('close', (code) => {
        exitCode = code;
        resolve();
      });
    });
    
    assert.strictEqual(exitCode, 1, 'Should exit with code 1');
    assert.ok(output.includes('not lower'), 'Output should mention rate is not lower');
    assert.ok(output.includes('15.99'), 'Output should show the rate');
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 13: negotiate without angle shows error
  {
    const testDescription = 'negotiate without angle shows error';
    const child = spawn('node', [cliPath, 'negotiate', 'streaming']);
    
    let output = '';
    let exitCode = null;
    
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      output += data.toString();
    });
    
    await new Promise((resolve) => {
      child.on('close', (code) => {
        exitCode = code;
        resolve();
      });
    });
    
    assert.strictEqual(exitCode, 1, 'Should exit with code 1');
    assert.ok(output.includes('angle'), 'Output should mention angle requirement');
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 14: approve without action shows error
  {
    const testDescription = 'approve without action shows error';
    const child = spawn('node', [cliPath, 'approve', 'streaming']);
    
    let output = '';
    let exitCode = null;
    
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      output += data.toString();
    });
    
    await new Promise((resolve) => {
      child.on('close', (code) => {
        exitCode = code;
        resolve();
      });
    });
    
    assert.strictEqual(exitCode, 1, 'Should exit with code 1');
    assert.ok(output.includes('action'), 'Output should mention action requirement');
    
    console.log(`✓ ${testDescription}`);
  }

  console.log('\nAll CLI approval tests passed!');
}

runTests().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
