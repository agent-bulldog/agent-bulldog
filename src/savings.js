/**
 * Savings tracker — record and report negotiated savings
 * Agent Bulldog — Kiroween 2026
 * 
 * T6.1: Tracks savings from approved offers, persists to disk.
 * R10: Records new rate and computes cumulative savings when a negotiation yields a lower price.
 * R11: Reports total estimated annual savings by service when user runs `node src/cli.js report`.
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_STORE_PATH = path.join(require('os').homedir(), '.agent-bulldog', 'savings.json');

/**
 * Creates a savings tracker instance
 * @param {Object} [options] - Configuration options
 * @param {string} [options.filePath] - Path to the savings store file (default: ~/.agent-bulldog/savings.json)
 * @returns {{recordSaving: Function, getReport: Function, listEntries: Function, clear: Function}}
 */
function createSavingsTracker(options = {}) {
  const filePath = options.filePath || DEFAULT_STORE_PATH;

  // Ensure directory exists
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Load existing entries or initialize empty
  let entries = [];
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      entries = JSON.parse(data);
    }
  } catch (err) {
    // If file is corrupted or unreadable, start fresh
    entries = [];
  }

  /**
   * Saves entries to disk
   */
  function save() {
    fs.writeFileSync(filePath, JSON.stringify(entries, null, 2));
  }

  /**
   * Validates money values and rounds to 2 decimal places
   * @param {number} value - The monetary value
   * @returns {number} - Rounded to 2 decimals
   */
  function roundMoney(value) {
    return Math.round(Number(value) * 100) / 100;
  }

  /**
   * Records a saving from an approved offer
   * @param {string} service - The service name
   * @param {Object} saving - Saving details
   * @param {number} saving.previousMonthlyCost - Previous monthly cost
   * @param {number} saving.newMonthlyCost - New monthly cost (must be lower)
   * @param {string} saving.plan - The plan name or description
   * @param {string} [saving.approvalId] - Optional approval ID for traceability
   * @returns {{success: true, entry: Object}|{error: true, message: string}}
   */
  function recordSaving(service, saving) {
    // Validate service name
    if (!service || typeof service !== 'string') {
      return {
        error: true,
        message: 'Missing service name'
      };
    }

    // Validate saving object
    if (!saving || typeof saving !== 'object') {
      return {
        error: true,
        message: 'Missing saving details object'
      };
    }

    const { previousMonthlyCost, newMonthlyCost, plan, approvalId } = saving;

    // Validate previousMonthlyCost
    if (previousMonthlyCost === undefined || previousMonthlyCost === null) {
      return {
        error: true,
        message: 'Missing previousMonthlyCost'
      };
    }
    const prevCost = Number(previousMonthlyCost);
    if (isNaN(prevCost)) {
      return {
        error: true,
        message: 'Invalid previousMonthlyCost value'
      };
    }

    // Validate newMonthlyCost
    if (newMonthlyCost === undefined || newMonthlyCost === null) {
      return {
        error: true,
        message: 'Missing newMonthlyCost'
      };
    }
    const newCost = Number(newMonthlyCost);
    if (isNaN(newCost)) {
      return {
        error: true,
        message: 'Invalid newMonthlyCost value'
      };
    }

    // Validate new rate is lower than previous
    if (newCost >= prevCost) {
      return {
        error: true,
        message: `New rate $${newCost.toFixed(2)} is not lower than previous rate $${prevCost.toFixed(2)}`
      };
    }

    // Validate plan
    if (!plan || typeof plan !== 'string') {
      return {
        error: true,
        message: 'Missing plan description'
      };
    }

    // Calculate savings (already validated to be positive)
    const monthlySavings = roundMoney(prevCost - newCost);
    const annualSavings = roundMoney(monthlySavings * 12);

    // Create entry
    const entry = {
      id: `SAVE-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      service: service,
      previousMonthlyCost: roundMoney(prevCost),
      newMonthlyCost: roundMoney(newCost),
      monthlySavings: monthlySavings,
      annualSavings: annualSavings,
      plan: plan,
      approvalId: approvalId || null,
      createdAt: new Date().toISOString()
    };

    entries.push(entry);
    save();

    return {
      success: true,
      entry: entry
    };
  }

  /**
   * Gets a formatted report of all savings
   * @returns {{byService: Object, totals: Object}}
   */
  function getReport() {
    // Aggregate by service
    const byService = {};

    for (const entry of entries) {
      if (!byService[entry.service]) {
        byService[entry.service] = {
          monthlySavings: 0,
          annualSavings: 0,
          count: 0
        };
      }
      byService[entry.service].monthlySavings += entry.monthlySavings;
      byService[entry.service].annualSavings += entry.annualSavings;
      byService[entry.service].count += 1;
    }

    // Round aggregated values
    for (const service in byService) {
      byService[service].monthlySavings = roundMoney(byService[service].monthlySavings);
      byService[service].annualSavings = roundMoney(byService[service].annualSavings);
    }

    // Calculate totals
    let totalMonthlySavings = 0;
    let totalAnnualSavings = 0;

    for (const service in byService) {
      totalMonthlySavings += byService[service].monthlySavings;
      totalAnnualSavings += byService[service].annualSavings;
    }

    const totals = {
      monthlySavings: roundMoney(totalMonthlySavings),
      annualSavings: roundMoney(totalAnnualSavings),
      serviceCount: Object.keys(byService).length
    };

    return {
      byService: byService,
      totals: totals
    };
  }

  /**
   * Lists all saved entries
   * @returns {Array}
   */
  function listEntries() {
    return [...entries];
  }

  /**
   * Clears all savings entries
   */
  function clear() {
    entries = [];
    save();
  }

  return {
    recordSaving,
    getReport,
    listEntries,
    clear
  };
}

module.exports = {
  createSavingsTracker,
  DEFAULT_STORE_PATH
};
