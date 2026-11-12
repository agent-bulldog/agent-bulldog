/**
 * CLI entry point
 * Agent Bulldog — Kiroween 2026
 * 
 * Usage: node src/cli.js <command> [options]
 * 
 * Commands:
 *   cancel-preview <service>  Preview cancellation flow and retention offer
 *   list-services             List configured services with their connector names
 *   compare <service>         Compare current bill against industry prices
 *   negotiate <service> --angle "..."  Execute negotiation attempt under approval
 *   approve <service> <action> [options]  Execute an approved action
 *   report                    Display estimated savings report (Coming soon)
 * 
 * Options:
 *   --angle <text>            Negotiation angle for negotiation command
 *   --rate <number>           Rate for apply-offer action
 *   --help                    Show this help message
 * 
 * Approval commands:
 *   approve <service> negotiate --angle "<angle>"   - Execute negotiation under approval
 *   approve <service> apply-offer --rate <number>   - Apply an offer under approval
 *   approve <service> cancel ...                    - ALWAYS REFUSED
 * 
 * Notes:
 *   - Approval is required before any state-changing action (negotiation or offer application)
 *   - Cancellation is NEVER allowed, even with approval
 */

const { getConnector } = require('./connectors/index');
const { createGate } = require('./approval/gate');
const { compareBill } = require('./comparison/indexer');
const { negotiateOnce } = require('./negotiation/engine');
const { nextRetryTime } = require('./negotiation/scheduler');

// Global approval gate instance
const approvalGate = createGate();

/**
 * Shows usage information
 */
function showUsage() {
  console.log(`
Agent Bulldog — A generalized AI negotiation agent

Usage: node src/cli.js <command> [options]

Commands:
  cancel-preview <service>  Preview cancellation flow and retention offer
  list-services             List configured services with their connector names
  compare <service>         Compare current bill against industry prices
  negotiate <service> --angle "..."  Execute negotiation attempt under approval
  approve <service> <action> [options]  Execute an approved action
  report                    Display estimated savings report (Coming soon)

Options:
  --angle <text>            Negotiation angle for negotiation command
  --rate <number>           Rate for apply-offer action
  --help                    Show this help message

Examples:
  node src/cli.js cancel-preview streaming
  node src/cli.js list-services
  node src/cli.js compare streaming
  node src/cli.js negotiate streaming --angle "loyalty"
  node src/cli.js approve streaming negotiate --angle "loyalty"
  node src/cli.js approve streaming apply-offer --rate 12.99

Notes:
  - Approval is required before any state-changing action (negotiation or offer application)
  - Cancellation is NEVER allowed, even with approval
`);
}

/**
 * Handles the cancel-preview command
 * @param {string} serviceName - The service name
 * @returns {Promise<number>} - Exit code (0 for success, 1 for error)
 */
async function handleCancelPreview(serviceName) {
  // Validate service name
  if (!serviceName) {
    console.error('Error: Service name is required. Usage: node src/cli.js cancel-preview <service>');
    return 1;
  }

  const connectorResult = getConnector(serviceName);
  
  if (connectorResult.error) {
    console.error(`Error: ${connectorResult.message}`);
    return 1;
  }

  const connector = connectorResult;

  try {
    const result = await connector.cancelFlowPreview();

    console.log(`\n=== Cancellation Flow Preview for ${serviceName} ===\n`);
    console.log('Steps taken:');
    result.stepsTaken.forEach((step, index) => {
      console.log(`  ${index + 1}. ${step}`);
    });
    
    console.log(`\nRetention offer: $${result.retentionOffer.monthlyCost.toFixed(2)}/month`);
    if (result.retentionOffer.description) {
      console.log(`  ${result.retentionOffer.description}`);
    }
    
    console.log('\n⚠️  WARNING: Cancellation was NOT confirmed.');
    console.log('   The flow stopped before confirming cancellation.');
    console.log('   No action has been taken on your account.\n');

    return 0;
  } catch (err) {
    console.error(`Error: Failed to preview cancellation flow for "${serviceName}": ${err.message || 'Unknown error'}`);
    return 1;
  }
}

/**
 * Handles the list-services command
 * @returns {Promise<number>} - Exit code (0 for success, 1 for error)
 */
async function handleListServices() {
  const services = [
    { service: 'streaming', connector: 'streaming' }
  ];

  console.log('Configured services:');
  services.forEach(s => {
    console.log(`  ${s.service} (connector: ${s.connector})`);
  });

  return 0;
}

/**
 * Handles the compare command
 * @param {string} serviceName - The service name
 * @returns {Promise<number>} - Exit code (0 for success, 1 for error)
 */
async function handleCompare(serviceName) {
  // Validate service name
  if (!serviceName) {
    console.error('Error: Service name is required. Usage: node src/cli.js compare <service>');
    return 1;
  }

  const result = await compareBill(serviceName);

  if (result.error) {
    console.error(`Error: ${result.message}`);
    return 1;
  }

  console.log(`\n=== Price Comparison for ${result.service} ===\n`);
  console.log(`Current plan: ${result.currentPlan}`);
  console.log(`Current monthly cost: $${result.currentMonthlyCost.toFixed(2)}`);

  if (result.bestAlternative) {
    console.log(`\nBest alternative: ${result.bestAlternative.plan || result.bestAlternative.name}`);
    console.log(`Alternative monthly cost: $${result.bestAlternative.monthlyCost.toFixed(2)}`);
    console.log(`Monthly savings: $${result.monthlySavings.toFixed(2)}`);
    console.log(`Annual savings: $${result.annualSavings.toFixed(2)}`);
  } else {
    console.log(`\n${result.message}`);
  }

  return 0;
}

/**
 * Handles the negotiate command
 * @param {string} serviceName - The service name
 * @param {string} angle - The negotiation angle
 * @returns {Promise<number>} - Exit code (0 for success, 1 for error)
 */
async function handleNegotiate(serviceName, angle) {
  // Validate service name
  if (!serviceName) {
    console.error('Error: Service name is required. Usage: node src/cli.js negotiate <service> --angle "..."');
    return 1;
  }

  // Validate angle
  if (!angle) {
    console.error('Error: Negotiation angle is required. Usage: node src/cli.js negotiate <service> --angle "angle_text"');
    return 1;
  }

  const result = await negotiateOnce(serviceName, angle, null);

  if (result.error) {
    console.error(`Error: ${result.message}`);
    return 1;
  }

  console.log(`\n=== Negotiation Result for ${result.service} ===\n`);
  
  if (result.success) {
    console.log(`Offer: $${result.offeredMonthlyCost.toFixed(2)}/month`);
    console.log(`Savings: $${result.monthlySavings.toFixed(2)}/month`);
    console.log(`Message: ${result.message}`);
    
    // Request approval for the negotiation
    const approval = approvalGate.requestApproval(serviceName, 'negotiate', { angle: angle, offer: result });
    
    if (approval.error) {
      console.error(`Error: ${approval.message}`);
      return 1;
    }

    console.log(`\nPending approval ID: ${approval.id}`);
    console.log(`To apply this offer, run: node src/cli.js approve ${serviceName} negotiate --angle "${angle}"`);
    console.log(`Note: The offer will only be applied after you explicitly approve it.`);
  } else {
    console.log(`Message: ${result.message}`);
    
    // Calculate next retry time
    const now = new Date();
    const nextTime = nextRetryTime(now);
    console.log(`\nNext retry time: ${nextTime.toISOString()}`);
    console.log(`Note: Retries use fresh negotiation angles.`);
  }

  return 0;
}

/**
 * Handles the approve command
 * @param {string} serviceName - The service name
 * @param {string} action - The action to approve (negotiate, apply-offer, cancel)
 * @param {string|null} angle - The negotiation angle (for negotiate action)
 * @param {number|null} rate - The rate for apply-offer action
 * @returns {Promise<number>} - Exit code (0 for success, 1 for error)
 */
async function handleApprove(serviceName, action, angle, rate) {
  // Validate service name
  if (!serviceName) {
    console.error('Error: Service name is required. Usage: node src/cli.js approve <service> <action> [options]');
    return 1;
  }

  // Validate action
  if (!action) {
    console.error('Error: Action is required. Usage: node src/cli.js approve <service> <action> [options]');
    console.error('Available actions: negotiate, apply-offer, cancel');
    return 1;
  }

  const normalizedAction = action.toLowerCase().trim();

  // Check for cancel action - ALWAYS REFUSED
  if (['cancel', 'cancel-order', 'cancel-service', 'cancel-subscription', 'confirm-cancel', 'confirm-cancellation', 'final-cancel', 'yes-cancel'].includes(normalizedAction)) {
    console.error('A cancellation can never be confirmed, with or without approval.');
    return 1;
  }

  // Handle negotiate action
  if (normalizedAction === 'negotiate') {
    if (!angle) {
      console.error('Error: Negotiation angle is required for negotiate action. Usage: node src/cli.js approve <service> negotiate --angle "angle_text"');
      return 1;
    }

    const approval = approvalGate.requestApproval(serviceName, 'negotiate', { angle: angle });

    if (approval.error) {
      console.error(`Error: ${approval.message}`);
      return 1;
    }

    // Mark as approved and run executor
    const approvalObj = approvalGate.applied.find(a => a.id === approval.id);
    if (approvalObj) {
      approvalObj.status = 'approved';
    } else {
      approvalGate.applied.push({ ...approval, status: 'approved' });
    }

    // Execute the negotiation
    const result = await negotiateOnce(serviceName, angle, null);

    console.log(`\n=== Negotiation Executed ===\n`);

    if (result.error) {
      console.error(`Error: ${result.message}`);
      return 1;
    }

    if (result.success) {
      console.log(`Offer: $${result.offeredMonthlyCost.toFixed(2)}/month`);
      console.log(`Savings: $${result.monthlySavings.toFixed(2)}/month`);
      console.log(`Message: ${result.message}`);
    } else {
      console.log(`Message: ${result.message}`);
    }

    return 0;
  }

  // Handle apply-offer action
  if (normalizedAction === 'apply-offer') {
    if (rate === undefined || rate === null) {
      console.error('Error: Rate is required for apply-offer action. Usage: node src/cli.js approve <service> apply-offer --rate <number>');
      return 1;
    }

    // Get current bill
    const connectorResult = getConnector(serviceName);
    if (connectorResult.error) {
      console.error(`Error: ${connectorResult.message}`);
      return 1;
    }

    const connector = connectorResult;
    const currentBill = await connector.currentBill(null);

    if (currentBill.error) {
      console.error(`Error: ${currentBill.message}`);
      return 1;
    }

    // Validate rate is lower than current bill
    if (rate >= currentBill.monthlyCost) {
      console.error(`Error: Proposed rate $${rate.toFixed(2)} is not lower than current bill $${currentBill.monthlyCost.toFixed(2)}`);
      return 1;
    }

    // Request and approve the apply-offer
    const approval = approvalGate.requestApproval(serviceName, 'apply-offer', { 
      rate: rate, 
      currentBill: currentBill 
    });

    if (approval.error) {
      console.error(`Error: ${approval.message}`);
      return 1;
    }

    // Mark as approved and run executor
    const approvalObj = approvalGate.applied.find(a => a.id === approval.id);
    if (approvalObj) {
      approvalObj.status = 'approved';
    } else {
      approvalGate.applied.push({ ...approval, status: 'approved' });
    }

    console.log(`\n=== Offer Applied ===\n`);
    console.log(`Service: ${serviceName}`);
    console.log(`New rate: $${rate.toFixed(2)}/month`);
    console.log(`Old rate: $${currentBill.monthlyCost.toFixed(2)}/month`);
    console.log(`Savings: $${(currentBill.monthlyCost - rate).toFixed(2)}/month`);
    console.log(`Confirmation: Offer has been applied successfully.`);

    return 0;
  }

  // Unknown action
  console.error(`Error: Unknown action "${action}"`);
  console.error('Available actions: negotiate, apply-offer');
  return 1;
}

/**
 * Handles unknown commands
 */
function handleUnknownCommand(command) {
  console.error(`Error: Unknown command "${command}"`);
  console.error('Run "node src/cli.js --help" to see available commands.\n');
  return 1;
}

/**
 * Handles the report command (not yet implemented)
 * @returns {Promise<number>} - Exit code (1 for not implemented)
 */
function handleReport() {
  console.error('Savings report is not yet available');
  return 1;
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);

  // No arguments or --help
  if (args.length === 0 || args.includes('--help')) {
    showUsage();
    return 0;
  }

  const command = args[0];

  switch (command) {
    case 'cancel-preview': {
      const serviceName = args[1];
      return await handleCancelPreview(serviceName);
    }

    case 'list-services':
      return await handleListServices();

    case 'compare': {
      const serviceName = args[1];
      return await handleCompare(serviceName);
    }

    case 'negotiate': {
      const serviceName = args[1];
      const angleArg = args.find((arg, idx) => arg === '--angle' && idx < args.length - 1);
      const angle = angleArg ? args[args.indexOf(angleArg) + 1] : null;
      return await handleNegotiate(serviceName, angle);
    }

    case 'approve': {
      const serviceName = args[1];
      const action = args[2];
      const angleArg = args.find((arg, idx) => arg === '--angle' && idx < args.length - 1);
      const angle = angleArg ? args[args.indexOf(angleArg) + 1] : null;
      const rateArg = args.find((arg, idx) => arg === '--rate' && idx < args.length - 1);
      const rate = rateArg ? parseFloat(args[args.indexOf(rateArg) + 1]) : null;
      return await handleApprove(serviceName, action, angle, rate);
    }

    case 'report':
      return handleReport();

    default:
      return handleUnknownCommand(command);
  }
}

// Export for testing
module.exports = {
  main,
  handleCancelPreview,
  handleListServices,
  handleCompare,
  handleNegotiate,
  handleApprove,
  handleReport,
  showUsage,
  approvalGate
};

// Run main if executed directly
if (require.main === module) {
  main().then((exitCode) => {
    process.exit(exitCode);
  });
}
