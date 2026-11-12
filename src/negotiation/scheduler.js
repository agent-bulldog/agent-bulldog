/**
 * Retry scheduler — fresh angles per attempt
 * Agent Bulldog — Kiroween 2026
 * 
 * T3.2: Manages retry schedule with angle rotation and business hours logic.
 * Angles: price_match, loyalty, complaint, competitor_switch, hardship
 * After 5 failed attempts, schedule ends with "provider will not budge".
 * No real waiting — times are computed for testing.
 */

const ANGLES = ['price_match', 'loyalty', 'complaint', 'competitor_switch', 'hardship'];
const MAX_ATTEMPTS = 5;

/**
 * Creates a new retry schedule for a service
 * @param {string} serviceName - The service name
 * @param {Object|null} credentials - User credentials (optional)
 * @returns {{serviceName: string, anglePool: Array<string>, attemptedAngles: Array<string>, attempts: number, success: boolean|null, done: boolean, lastAttemptAt: null|Date}}
 */
function createSchedule(serviceName, credentials) {
  return {
    serviceName: serviceName,
    anglePool: [...ANGLES], // Copy of angle array
    attemptedAngles: [],
    attempts: 0,
    success: null,
    done: false,
    lastAttemptAt: null,
    credentials: credentials || null,
    message: null
  };
}

/**
 * Computes next retry time: 6 hours OR next business hours, whichever is later
 * Business hours: Mon-Fri 09:00-17:00 local time
 * @param {Date} lastAttemptAt - When the last attempt occurred
 * @returns {Date} - When the next attempt is due
 */
function nextRetryTime(lastAttemptAt) {
  // Calculate 6 hours later
  const sixHoursLater = new Date(lastAttemptAt.getTime() + 6 * 60 * 60 * 1000);
  
  // Start with 6 hours later and adjust to business hours
  let candidate = new Date(sixHoursLater);
  
  // Keep adjusting until we find a valid business hours time
  while (true) {
    const day = candidate.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
    const hour = candidate.getHours();
    
    // If weekend, advance to Monday at 09:00
    if (day === 0 || day === 6) {
      if (day === 0) {
        // Sunday, advance by 1 day to Monday
        candidate.setDate(candidate.getDate() + 1);
      } else {
        // Saturday, advance by 2 days to Monday
        candidate.setDate(candidate.getDate() + 2);
      }
      candidate.setHours(9, 0, 0, 0);
      continue;
    }
    
    // Weekday - check if during business hours
    if (hour < 9) {
      // Before business hours, set to 09:00 same day
      candidate.setHours(9, 0, 0, 0);
      return candidate;
    }
    
    if (hour >= 17) {
      // After business hours, advance to next day at 09:00
      candidate.setDate(candidate.getDate() + 1);
      candidate.setHours(9, 0, 0, 0);
      continue; // Re-check the new date
    }
    
    // During business hours (09:00-17:00) on a weekday
    return candidate;
  }
}

/**
 * Gets the next available angle for a schedule (rotates without repetition)
 * @param {Object} schedule - The schedule object
 * @returns {string|null} - The next angle, or null if no angles remain
 */
function getNextAngle(schedule) {
  if (schedule.anglePool.length === 0) {
    return null;
  }
  // Pop from front to maintain rotation order
  return schedule.anglePool.shift();
}

/**
 * Runs the next attempt in the schedule
 * @param {Object} schedule - The schedule object (modified in place)
 * @param {string} angle - The angle to use for this attempt
 * @returns {Promise<{success: boolean, monthlySavings: number, message: string}|{error: true, message: string}>}
 */
async function runAttempt(schedule, angle) {
  const { negotiateOnce } = require('./engine');
  
  const result = await negotiateOnce(schedule.serviceName, angle, schedule.credentials);
  
  // Update schedule state
  schedule.attempts += 1;
  schedule.attemptedAngles.push(angle);
  schedule.lastAttemptAt = new Date();
  
  // Handle error
  if (result.error) {
    schedule.message = result.message;
    schedule.success = false;
    schedule.done = true;
    return {
      error: true,
      message: result.message
    };
  }
  
  // Check for success (offer lower than current bill)
  if (result.success) {
    schedule.success = true;
    schedule.done = true;
    schedule.message = `Negotiation successful! Offered rate: $${result.offeredMonthlyCost}/month (was $${result.currentMonthlyCost}/month). Savings: $${result.monthlySavings}/month`;
    return {
      success: true,
      monthlySavings: result.monthlySavings,
      message: result.message
    };
  }
  
  // No improvement — record failure
  schedule.success = false;
  
  // Check if we've exhausted all angles
  if (schedule.attempts >= MAX_ATTEMPTS) {
    schedule.done = true;
    schedule.message = 'Provider will not budge after 5 attempts';
    return {
      success: false,
      monthlySavings: 0,
      message: 'Provider will not budge after 5 attempts'
    };
  }
  
  // Continue to next attempt
  return {
    success: false,
    monthlySavings: 0,
    message: result.message
  };
}

/**
 * Drives the next attempt, automatically fetching the next angle
 * @param {Object} schedule - The schedule object (modified in place)
 * @returns {Promise<Object>} - Result object
 */
async function runNextAttempt(schedule) {
  // Check if schedule is already done
  if (schedule.done) {
    return {
      error: true,
      message: schedule.message || 'Schedule is already done'
    };
  }
  
  // Get next angle
  const angle = getNextAngle(schedule);
  
  if (angle === null) {
    schedule.done = true;
    schedule.message = 'No angles remaining';
    return {
      error: true,
      message: 'No angles remaining'
    };
  }
  
  // Run the attempt
  return await runAttempt(schedule, angle);
}

/**
 * Gets the next retry time without running an attempt (for display/scheduling)
 * @param {Object} schedule - The schedule object
 * @returns {Date|null} - When the next attempt should occur, or null if done
 */
function getNextRetryTime(schedule) {
  if (schedule.done || schedule.attempts >= MAX_ATTEMPTS) {
    return null;
  }
  
  if (schedule.lastAttemptAt === null) {
    // First attempt — can be immediate
    return new Date();
  }
  
  return nextRetryTime(schedule.lastAttemptAt);
}

module.exports = {
  createSchedule,
  getNextAngle,
  runAttempt,
  runNextAttempt,
  nextRetryTime,
  getNextRetryTime
};
