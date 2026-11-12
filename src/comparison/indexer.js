/**
 * Price comparison indexer
 * Agent Bulldog — Kiroween 2026
 * 
 * Fetches and compares prices across services to find better like-for-like alternatives.
 */

const { getConnector } = require('../connectors/index');

// Industry price index fixtures — competitor pricing at matching tiers
const industryPriceIndex = {
  streaming: [
    { service: 'StreamWave', plan: 'Basic', monthlyCost: 8.99, description: 'Standard definition, 1 screen' },
    { service: 'StreamWave', plan: 'Standard', monthlyCost: 15.99, description: 'High definition, 2 screens' },
    { service: 'StreamWave', plan: 'Premium', monthlyCost: 21.99, description: '4K Ultra HD, 4 screens' },
    { service: 'RivalStream', plan: 'Basic', monthlyCost: 7.99, description: 'Standard definition, 1 screen' },
    { service: 'RivalStream', plan: 'Standard', monthlyCost: 12.99, description: 'High definition, 2 screens' },
    { service: 'RivalStream', plan: 'Premium', monthlyCost: 19.99, description: '4K Ultra HD, 4 screens' }
  ]
};

/**
 * Builds comparison index for a service
 * Uses connector fixture data (no real API calls)
 * @param {string} serviceName - The service name (e.g., 'streaming', 'insurance')
 * @returns {{service: string, currentBill: Object, plans: Array, industryPrices: Array}|{error: true, message: string}}
 */
async function buildIndex(serviceName) {
  const connectorResult = getConnector(serviceName);
  
  if (connectorResult.error) {
    return {
      error: true,
      message: connectorResult.message
    };
  }
  
  const connector = connectorResult;
  
  try {
    const plans = await connector.listPlans();
    const currentBill = await connector.currentBill();
    
    // Get industry prices for this service, or empty array if not available
    const industryPrices = industryPriceIndex[serviceName] || [];
    
    return {
      service: serviceName,
      currentBill: currentBill,
      plans: plans,
      industryPrices: industryPrices
    };
  } catch (err) {
    return {
      error: true,
      message: `Failed to fetch data for service "${serviceName}": ${err.message || 'Unknown error'}`
    };
  }
}

/**
 * Verifies like-for-like match between candidate plan and current plan
 * 
 * For streaming: matches by plan name and description (tier and features)
 * For insurance: requires deductible, coverageLimits, and insurerRating to match exactly
 * 
 * @param {Object} candidate - The candidate plan to check
 * @param {Object} current - The current plan
 * @returns {boolean}
 */
function verifyLikeForLike(candidate, current) {
  // Handle candidate from industryPrices (has 'plan' field instead of 'name')
  const candidateName = candidate.plan || candidate.name;
  const candidateDesc = candidate.description;
  
  // Handle current bill from connector (has 'plan' string or plan object with 'name')
  const currentPlanName = typeof current === 'string' ? current : current.name;
  const currentDesc = typeof current === 'string' ? undefined : current.description;
  
  // Insurance check: both objects must carry deductible, coverageLimits and insurerRating
  // All three must be equal or the check fails
  if (current.deductible !== undefined && current.coverageLimits !== undefined && current.insurerRating !== undefined) {
    if (candidate.deductible === undefined || candidate.coverageLimits === undefined || candidate.insurerRating === undefined) {
      return false;
    }
    if (candidate.deductible !== current.deductible) {
      return false;
    }
    if (candidate.coverageLimits !== current.coverageLimits) {
      return false;
    }
    if (candidate.insurerRating !== current.insurerRating) {
      return false;
    }
    return true;
  }
  
  // Streaming/check by plan name and description (tier and features)
  if (currentPlanName !== undefined && currentDesc !== undefined) {
    if (candidateName !== currentPlanName) {
      return false;
    }
    if (candidateDesc !== currentDesc) {
      return false;
    }
    return true;
  }
  
  // Fallback: no clear like-for-like criteria defined
  return false;
}

/**
 * Compares current bill against industry prices to find cheaper like-for-like alternatives
 * @param {string} serviceName - The service name
 * @returns {{service: string, currentPlan: Object, currentMonthlyCost: number, bestAlternative: Object|null, bestMonthlyCost: number|NaN, monthlySavings: number, annualSavings: number, likeForLike: true}|{service: string, currentPlan: Object, currentMonthlyCost: number, bestAlternative: null, monthlySavings: number, annualSavings: number, message: string}|{error: true, message: string}}
 */
async function compareBill(serviceName) {
  const index = await buildIndex(serviceName);
  
  if (index.error) {
    return {
      error: true,
      message: index.message
    };
  }
  
  const { service, currentBill, plans, industryPrices } = index;
  
  // currentBill from streaming connector has { plan: "Standard", monthlyCost: 15.99 }
  // where 'plan' is the plan name string
  const currentPlanName = typeof currentBill.plan === 'string' ? currentBill.plan : (currentBill.plan?.name || currentBill.plan);
  const currentMonthlyCost = currentBill.monthlyCost;

  // Find cheapest like-for-like alternative that costs less than current
  let bestAlternative = null;
  let bestMonthlyCost = Infinity;
  
  // Check against industry prices first (competitor plans)
  for (const competitorPlan of industryPrices) {
    if (competitorPlan.monthlyCost < currentMonthlyCost) {
      // For competitor plans, match by plan name (tier) only
      if (competitorPlan.plan === currentPlanName) {
        if (competitorPlan.monthlyCost < bestMonthlyCost) {
          bestMonthlyCost = competitorPlan.monthlyCost;
          bestAlternative = competitorPlan;
        }
      }
    }
  }
  
  // Also check against own service's plans
  for (const plan of plans) {
    if (plan.monthlyCost < currentMonthlyCost) {
      if (plan.name === currentPlanName) {
        if (plan.monthlyCost < bestMonthlyCost) {
          bestMonthlyCost = plan.monthlyCost;
          bestAlternative = plan;
        }
      }
    }
  }
  
  if (bestAlternative !== null) {
    const monthlySavings = Math.round((currentMonthlyCost - bestMonthlyCost) * 100) / 100;
    const annualSavings = Math.round(monthlySavings * 12 * 100) / 100;
    
    return {
      service: service,
      currentPlan: currentPlanName,
      currentMonthlyCost: currentMonthlyCost,
      bestAlternative: bestAlternative,
      bestMonthlyCost: bestMonthlyCost,
      monthlySavings: monthlySavings,
      annualSavings: annualSavings,
      likeForLike: true
    };
  }
  
  // No cheaper like-for-like plan found
  return {
    service: service,
    currentPlan: currentPlanName,
    currentMonthlyCost: currentMonthlyCost,
    bestAlternative: null,
    monthlySavings: 0,
    annualSavings: 0,
    message: 'No cheaper like-for-like plan found'
  };
}

module.exports = {
  buildIndex,
  verifyLikeForLike,
  compareBill
};
