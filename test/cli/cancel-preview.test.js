/**
 * cancel-preview CLI command tests
 * Agent Bulldog — Kiroween 2026
 * 
 * node --test test/cli/cancel-preview.test.js
 */

const assert = require('node:assert');
const { spawn } = require('node:child_process');
const path = require('node:path');

async function runTests() {
  console.log('=== CLI cancel-preview Tests ===\n');

  // Test 1: cancel-preview streaming shows retention offer and not confirmed
  {
    const testDescription = 'cancel-preview streaming shows retention offer and not confirmed';
    
    const cliPath = path.join(__dirname, '../../src/cli.js');
    const child = spawn('node', [cliPath, 'cancel-preview', 'streaming']);
    
    let output = '';
    let errorOutput = '';
    
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    await new Promise((resolve, reject) => {
      child.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`CLI exited with code ${code}: ${errorOutput}`));
        }
        resolve();
      });
    });
    
    // Check that retention offer is shown
    assert.ok(output.includes('$12.99'), 'Output should show the retention offer amount');
    assert.ok(output.includes('Retention offer'), 'Output should mention retention offer');
    
    // Check that it states cancellation was NOT confirmed
    assert.ok(output.includes('NOT confirmed'), 'Output should state cancellation was NOT confirmed');
    assert.ok(output.includes('WARNING'), 'Output should contain a warning');
    
    // Check that no action was taken
    assert.ok(output.includes('No action has been taken'), 'Output should state no action was taken');
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 2: Unknown service returns error without stack trace
  {
    const testDescription = 'Unknown service returns error without stack trace';
    
    const cliPath = path.join(__dirname, '../../src/cli.js');
    const child = spawn('node', [cliPath, 'cancel-preview', 'unknown_service_xyz']);
    
    let output = '';
    let errorOutput = '';
    let exitCode = null;
    
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    await new Promise((resolve) => {
      child.on('close', (code) => {
        exitCode = code;
        resolve();
      });
    });
    
    // Check that it exited with non-zero code
    assert.ok(exitCode !== null && exitCode !== 0, 'Should exit with non-zero code');
    
    // Check that error message is human-readable
    const combinedOutput = output + errorOutput;
    assert.ok(combinedOutput.includes('Unknown service: unknown_service_xyz'), 
              'Output should mention the unknown service error');
    
    // Check that there's no stack trace (no "at " frames from function calls)
    assert.ok(!combinedOutput.includes('    at '), 'Should not contain stack trace (no "at " frames)');
    assert.ok(!combinedOutput.includes('TypeError'), 'Should not contain TypeError');
    assert.ok(!combinedOutput.includes('at main'), 'Should not contain internal stack frames');
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 3: Missing service argument shows error
  {
    const testDescription = 'Missing service argument shows error';
    
    const cliPath = path.join(__dirname, '../../src/cli.js');
    const child = spawn('node', [cliPath, 'cancel-preview']);
    
    let output = '';
    let errorOutput = '';
    let exitCode = null;
    
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    await new Promise((resolve) => {
      child.on('close', (code) => {
        exitCode = code;
        resolve();
      });
    });
    
    // Check that it exited with non-zero code
    assert.ok(exitCode !== null && exitCode !== 0, 'Should exit with non-zero code');
    
    // Check that error message mentions missing service
    const combinedOutput = output + errorOutput;
    assert.ok(combinedOutput.includes('Error'), 'Output should contain "Error"');
    assert.ok(combinedOutput.includes('Service name is required') || combinedOutput.includes('usage'), 
              'Output should mention missing service requirement');
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 4: --help shows usage
  {
    const testDescription = '--help shows usage';
    
    const cliPath = path.join(__dirname, '../../src/cli.js');
    const child = spawn('node', [cliPath, '--help']);
    
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
    
    // Check that it exited with zero code
    assert.strictEqual(exitCode, 0, 'Should exit with code 0');
    
    // Check that usage is shown
    assert.ok(output.includes('Usage'), 'Output should contain "Usage"');
    assert.ok(output.includes('cancel-preview'), 'Output should mention cancel-preview command');
    assert.ok(output.includes('list-services') || output.includes('Commands'), 'Output should list commands');
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 5: No arguments shows usage
  {
    const testDescription = 'No arguments shows usage';
    
    const cliPath = path.join(__dirname, '../../src/cli.js');
    const child = spawn('node', [cliPath]);
    
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
    
    // Check that it exited with zero code
    assert.strictEqual(exitCode, 0, 'Should exit with code 0');
    
    // Check that usage is shown
    assert.ok(output.includes('Usage'), 'Output should contain "Usage"');
    assert.ok(output.includes('cancel-preview'), 'Output should mention cancel-preview command');
    
    console.log(`✓ ${testDescription}`);
  }

  console.log('\nAll CLI cancel-preview tests passed!');
}

runTests().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
