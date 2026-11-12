/**
 * Streaming connector — StreamWave fixture data (demo mode only)
 * Agent Bulldog — Kiroween 2026
 * 
 * No real API calls. All data is fixture-based.
 */

// StreamWave fixture data
const fixturePlans = [
  { name: 'Basic', monthlyCost: 8.99, description: 'Standard definition, 1 screen' },
  { name: 'Standard', monthlyCost: 15.99, description: 'High definition, 2 screens' },
  { name: 'Premium', monthlyCost: 21.99, description: '4K Ultra HD, 4 screens' }
];

const fixtureCurrentBill = {
  plan: 'Standard',
  monthlyCost: 15.99
};

/**
 * Validates credentials — returns true if credentials present, false otherwise
 * @param {Object|null} credentials - User credentials
 * @returns {boolean}
 */
function hasCredentials(credentials) {
  return credentials !== null && credentials !== undefined;
}

/**
 * Returns available StreamWave plans
 * @param {Object|null} credentials - User credentials (optional for demo)
 * @returns {Array|{error: true, message: string}}
 */
async function listPlans(credentials) {
  // Always use fixture data for demo mode
  return fixturePlans;
}

/**
 * Returns user's current bill
 * @param {Object|null} credentials - User credentials (optional for demo)
 * @returns {{plan: string, monthlyCost: number}|{error: true, message: string}}
 */
async function currentBill(credentials) {
  // Always use fixture data for demo mode
  return fixtureCurrentBill;
}

/**
 * Attempts negotiation with StreamWave
 * @param {Object|null} credentials - User credentials (optional for demo)
 * @param {string} angle - Negotiation angle (e.g., "price_match", "loyalty", "complaint")
 * @returns {{success: boolean, angle: string, offeredMonthlyCost: number, message: string}|{error: true, message: string}}
 */
async function negotiate(credentials, angle) {
  // Demo mode simulation — no real negotiation happens
  // Simulate various outcomes based on angle
  const outcomes = {
    price_match: {
      success: true,
      offeredMonthlyCost: 13.99,
      message: 'We can match a competitor\'s rate for $13.99/month'
    },
    loyalty: {
      success: true,
      offeredMonthlyCost: 12.99,
      message: 'As a loyal customer, we can offer $12.99/month'
    },
    complaint: {
      success: true,
      offeredMonthlyCost: 11.99,
      message: 'We hear you. Here\'s a special rate of $11.99/month'
    },
    default: {
      success: false,
      offeredMonthlyCost: 15.99,
      message: 'I don\'t have authority to offer a better rate right now'
    }
  };
  
  const result = outcomes[angle] || outcomes.default;
  
  return {
    success: result.success,
    angle: angle,
    offeredMonthlyCost: result.offeredMonthlyCost,
    message: result.message
  };
}

/**
 * Walks the cancel flow to retention offer without confirming
 * R7: Bluff-cancel only — never confirm cancellation
 * @param {Object|null} credentials - User credentials (optional for demo)
 * @returns {{stepsTaken: Array, retentionOffer: {monthlyCost: number}, confirmed: boolean}}
 */
async function cancelFlowPreview(credentials) {
  // Demo mode simulation of cancel flow
  const stepsTaken = [
    'Navigate to account settings',
    'Select "Manage Subscription"',
    'Click "Cancel Subscription"',
    'View retention options'
  ];
  
  const retentionOffer = {
    monthlyCost: 12.99,
    description: 'Special retention rate for loyal customers'
  };
  
  // R7: Never confirm cancellation — always return confirmed: false
  return {
    stepsTaken: stepsTaken,
    retentionOffer: retentionOffer,
    confirmed: false
  };
}

module.exports = {
  listPlans,
  currentBill,
  negotiate,
  cancelFlowPreview
};
