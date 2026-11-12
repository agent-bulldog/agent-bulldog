/**
 * CLI entry point
 * Agent Bulldog — Kiroween 2026
 * 
 * Usage: node src/cli.js <command>
 * 
 * Commands:
 *   cancel-preview <service>  - Preview cancellation flow and retention offer
 *   list-services             - List configured services
 *   compare <service>         - Compare current bill against industry prices
 *   negotiate <service> --angle "..."  - Execute negotiation attempt
 *   report                    - Display estimated savings report
 * 
 * Options:
 *   --help                    - Show this help message
 */

const { getConnector } = require('./connectors/index');

/**
 * Shows usage information
 */
function showUsage() {
  console.log(`
Agent Bulldog — A generalized AI negotiation agent

Usage: node src/cli.js <command> [options]

Commands:
  cancel-preview <service>  Preview cancellation flow and retention offer
  list-services             List configured services
  compare <service>         Compare current bill against industry prices
  negotiate <service>       Negotiate with a service (requires --angle)
  report                    Display estimated savings report

Options:
  --help                    Show this help message

Examples:
  node src/cli.js cancel-preview streaming
  node src/cli.js list-services
  node src/cli.js compare streaming
  node src/cli.js negotiate streaming --angle "loyalty"
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
 * Handles unknown commands
 */
function handleUnknownCommand(command) {
  console.error(`Error: Unknown command "${command}"`);
  console.error('Run "node src/cli.js --help" to see available commands.\n');
  return 1;
}

/**
 * Handles commands not yet implemented
 */
function handleNotImplemented(command) {
  console.log(`\nCommand "${command}" is not yet implemented.\n`);
  console.log('Current phase (d) only supports: cancel-preview\n');
  return 0;
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
    case 'compare':
    case 'negotiate':
    case 'report':
      return handleNotImplemented(command);

    default:
      return handleUnknownCommand(command);
  }
}

// Export for testing
module.exports = {
  main,
  handleCancelPreview,
  showUsage
};

// Run main if executed directly
if (require.main === module) {
  main().then((exitCode) => {
    process.exit(exitCode);
  });
}
