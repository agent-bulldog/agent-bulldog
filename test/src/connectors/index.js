/**
 * Connector registry and interface validation
 * Agent Bulldog — Kiroween 2026
 */

const streamingConnector = require('./streaming');

const connectorRegistry = {
  streaming: streamingConnector
};

/**
 * Validates that a connector exports all required methods
 * @param {Object} connector - The connector module to validate
 * @param {string} name - The connector name for error messages
 * @returns {{valid: true}} | {{valid: false, message: string}}
 */
function validateConnector(connector, name) {
  const requiredMethods = ['listPlans', 'currentBill', 'negotiate', 'cancelFlowPreview'];
  
  for (const method of requiredMethods) {
    if (typeof connector[method] !== 'function') {
      return {
        valid: false,
        message: `Connector "${name}" is missing required method: ${method}`
      };
    }
  }
  
  return { valid: true };
}

/**
 * Returns list of configured services with their connector names
 * @returns {Array<{service: string, connector: string}>}
 */
function listServices() {
  return [
    { service: 'streaming', connector: 'streaming' }
  ];
}

/**
 * Gets a connector by name
 * @param {string} name - The connector name
 * @returns {Object} - The connector module or {error: true, message}
 */
function getConnector(name) {
  if (connectorRegistry[name]) {
    return connectorRegistry[name];
  }
  
  return {
    error: true,
    message: `Unknown service: ${name}. Available services: ${listServices().map(s => s.service).join(', ')}`
  };
}

module.exports = {
  connectorRegistry,
  validateConnector,
  listServices,
  getConnector
};
