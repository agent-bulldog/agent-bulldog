/**
 * Negotiation engine — single negotiation attempt
 * Agent Bulldog — Kiroween 2026
 * 
 * T3.1: Executes one negotiation attempt without retries.
 * Returns normalized result with savings calculation.
 * No approval, no confirmation — single attempt only.
 */

const { getConnector } = require('../connectors/index');

/**
 * Single negotiation attempt
 * @param {string} serviceName - The service name (e.g., 'streaming')
 * @param {string} angle - Negotiation angle (e.g., 'price_match', 'loyalty')
 * @param {Object|null} credentials - User credentials (optional, defaults to demo mode)
 * @returns {Promise<{service: string, angle: string, success: boolean, offeredMonthlyCost: number, currentMonthlyCost: number, monthlySavings: number, message: string}|{error: true, message: string}>}
 */
async function negotiateOnce(serviceName, angle, credentials) {
  // Load connector for the service
  const connectorResult = getConnector(serviceName);
  
  if (connectorResult.error) {
    return {
      error: true,
      message: connectorResult.message
    };
  }
  
  const connector = connectorResult;
  
  try {
    // Get current bill to compare against offer
    const currentBill = await connector.currentBill(credentials);
    
    // Guard against currentBill returning an error object
    if (currentBill.error) {
      return {
        error: true,
        message: `Failed to get current bill for service "${serviceName}": ${currentBill.message}`
      };
    }
    
    const currentMonthlyCost = currentBill.monthlyCost;
    
    // Execute negotiation attempt
    const negotiationResult = await connector.negotiate(credentials, angle);
    
    // Handle connector error response
    if (negotiationResult.error) {
      return {
        error: true,
        message: negotiationResult.message
      };
    }
    
    const offeredMonthlyCost = negotiationResult.offeredMonthlyCost;
    const success = negotiationResult.success && (offeredMonthlyCost < currentMonthlyCost);
    
    // Calculate savings (0 if not successful)
    const monthlySavings = success ? Math.round((currentMonthlyCost - offeredMonthlyCost) * 100) / 100 : 0;
    
    // Normalize result
    return {
      service: serviceName,
      angle: angle,
      success: success,
      offeredMonthlyCost: offeredMonthlyCost,
      currentMonthlyCost: currentMonthlyCost,
      monthlySavings: monthlySavings,
      message: negotiationResult.message
    };
    
  } catch (err) {
    return {
      error: true,
      message: `Negotiation failed for service "${serviceName}": ${err.message || 'Unknown error'}`
    };
  }
}

module.exports = {
  negotiateOnce
};
