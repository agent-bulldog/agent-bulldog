/**
 * CLI report command tests
 * Agent Bulldog — Kiroween 2026
 * 
 * node --test test/cli/report.test.js
 */

const assert = require('node:assert');
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

// Helper to get current bill for streaming demo
async function getDemoCurrentBill() {
  const { getConnector } = require(path.join(__dirname, '../../src/connectors/index'));
  const connector = getConnector('streaming');
  return connector.currentBill(null);
}

async function runTests() {
  console.log('=== CLI report Tests ===\n');

  // Test 1: report with no savings shows friendly message
  {
    const testDescription = 'report with no savings shows friendly message';
    const tempFile = path.join(__dirname, 'temp-report-no-savings.json');
    
    // Clean up if exists
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }

    const cliPath = path.join(__dirname, '../../src/cli.js');
    const child = spawn('node', [cliPath, 'report', '--savings-file', tempFile]);
    
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
    
    // Check that it exited with zero code (not error)
    assert.strictEqual(exitCode, 0, 'Should exit with code 0');
    
    // Check that it shows friendly message
    const combinedOutput = output + errorOutput;
    assert.ok(combinedOutput.includes('No savings recorded yet'), 'Output should show friendly message');
    assert.ok(combinedOutput.includes('Run negotiations and apply offers'), 'Output should suggest next steps');
    
    // Clean up
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }

    console.log(`✓ ${testDescription}`);
  }

  // Test 2: report shows savings after apply-offer
  {
    const testDescription = 'report shows savings after apply-offer';
    const tempFile = path.join(__dirname, 'temp-report-with-savings.json');
    
    // Clean up if exists
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }

    const cliPath = path.join(__dirname, '../../src/cli.js');
    
    // Get current bill from demo connector
    const demoBill = await getDemoCurrentBill();
    const currentRate = demoBill.monthlyCost; // Should be 15.99
    const newRate = 12.99;
    
    // Step 1: Approve and apply offer
    const applyChild = spawn('node', [
      cliPath, 'approve', 'streaming', 'apply-offer',
      '--rate', newRate.toString(),
      '--savings-file', tempFile
    ]);
    
    let applyOutput = '';
    let applyExitCode = null;
    
    applyChild.stdout.on('data', (data) => {
      applyOutput += data.toString();
    });
    
    applyChild.stderr.on('data', (data) => {
      // Ignore stderr for now
    });
    
    await new Promise((resolve) => {
      applyChild.on('close', (code) => {
        applyExitCode = code;
        resolve();
      });
    });
    
    // Step 2: Run report
    const reportChild = spawn('node', [cliPath, 'report', '--savings-file', tempFile]);
    
    let reportOutput = '';
    let reportExitCode = null;
    
    reportChild.stdout.on('data', (data) => {
      reportOutput += data.toString();
    });
    
    await new Promise((resolve) => {
      reportChild.on('close', (code) => {
        reportExitCode = code;
        resolve();
      });
    });
    
    // Check that report shows savings
    assert.ok(reportOutput.includes('Estimated Savings Report'), 'Report should show header');
    assert.ok(reportOutput.includes('streaming'), 'Report should show streaming service');
    assert.ok(reportOutput.includes('$3.00'), 'Report should show $3.00 monthly savings');
    assert.ok(reportOutput.includes('$36.00'), 'Report should show $36.00 annual savings');
    
    // Clean up
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }

    console.log(`✓ ${testDescription}`);
  }

  // Test 3: Multiple savings aggregation
  {
    const testDescription = 'Multiple savings aggregation';
    const tempFile = path.join(__dirname, 'temp-report-multiple.json');
    
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }

    const cliPath = path.join(__dirname, '../../src/cli.js');
    
    // Get current bills
    const demoBill = await getDemoCurrentBill();
    const streamingCurrent = demoBill.monthlyCost;
    const phoneCurrent = 55.00; // From demo connector
    
    // Apply two offers for streaming
    for (let i = 0; i < 2; i++) {
      const rate = 12.99 - i; // 12.99, 12.98
      const child = spawn('node', [
        cliPath, 'approve', 'streaming', 'apply-offer',
        '--rate', rate.toString(),
        '--savings-file', tempFile
      ]);
      
      await new Promise((resolve) => {
        child.on('close', resolve);
      });
    }
    
    // Run report
    const reportChild = spawn('node', [cliPath, 'report', '--savings-file', tempFile]);
    
    let reportOutput = '';
    
    reportChild.stdout.on('data', (data) => {
      reportOutput += data.toString();
    });
    
    await new Promise((resolve) => {
      reportChild.on('close', resolve);
    });
    
    // Check totals
    // Streaming: (streamingCurrent-12.99) + (streamingCurrent-12.98) 
    // Total should be displayed
    
    assert.ok(reportOutput.includes('streaming'), 'Report should show streaming service');
    assert.ok(reportOutput.includes('Total'), 'Report should show Total (monthly or annual)');
    
    // Clean up
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }

    console.log(`✓ ${testDescription}`);
  }

  console.log('\nAll CLI report tests passed!');
}

runTests().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
