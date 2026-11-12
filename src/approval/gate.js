/**
 * Approval gate — explicit user confirmation before state-changing actions
 * Agent Bulldog — Kiroween 2026
 * 
 * T5.1: Implements approval workflow with request/approve/reject lifecycle.
 * FORBIDDEN actions: cancel and any cancel variants — never confirmed.
 */

/**
 * Creates a new approval gate
 * @returns {{pending: Map, applied: Array, requestApproval: Function, approve: Function, reject: Function, executeIfApproved: Function, executeApproved: Function, listPending: Function, listApplied: Function}}
 */
function createGate() {
  const pending = new Map();
  const applied = [];
  let approvalCounter = 0;

  // Forbidden actions that can never be confirmed
  const FORBIDDEN_ACTIONS = ['cancel', 'cancel-order', 'cancel-service', 'cancel-subscription', 'confirm-cancel', 'confirm-cancellation', 'final-cancel', 'yes-cancel', 'confirm-service-cancel'];

  /**
   * Validates if an action is forbidden
   * @param {string} action - The action to check
   * @returns {boolean}
   */
  function isForbidden(action) {
    const normalizedAction = action.toLowerCase().trim();
    return FORBIDDEN_ACTIONS.some(f => f === normalizedAction);
  }

  /**
   * Generates a unique approval ID
   * @returns {string}
   */
  function generateApprovalId() {
    approvalCounter += 1;
    return `APP-${approvalCounter.toString().padStart(6, '0')}`;
  }

  /**
   * Validates apply-offer rate against current bill
   * @param {Object} details - Approval details containing rate and currentBill
   * @returns {{valid: true}|{error: true, message: string}}
   */
  function validateApplyOffer(details) {
    if (!details) {
      return {
        error: true,
        message: 'Missing details for apply-offer'
      };
    }
    
    if (details.rate === undefined) {
      return {
        error: true,
        message: 'Missing rate for apply-offer'
      };
    }
    
    if (!details.currentBill || details.currentBill.monthlyCost === undefined) {
      return {
        error: true,
        message: 'Missing currentBill with monthlyCost for apply-offer'
      };
    }

    const rate = Number(details.rate);
    const currentCost = Number(details.currentBill.monthlyCost);

    if (isNaN(rate) || isNaN(currentCost)) {
      return {
        error: true,
        message: 'Invalid rate or currentBill value'
      };
    }

    if (rate >= currentCost) {
      return {
        error: true,
        message: `Proposed rate $${rate.toFixed(2)} is not lower than current bill $${currentCost.toFixed(2)}`
      };
    }

    return { valid: true };
  }

  /**
   * Creates a new pending approval request
   * @param {string} service - The service name
   * @param {string} action - The action to perform
   * @param {Object} details - Additional details (e.g., angle, rate)
   * @returns {{id: string, service: string, action: string, status: 'pending', details: Object, createdAt: Date}|{error: true, message: string}}
   */
  function requestApproval(service, action, details) {
    // Check if action is forbidden
    if (isForbidden(action)) {
      return {
        error: true,
        message: 'A cancellation can never be confirmed, with or without approval.'
      };
    }

    // Validate apply-offer rate against current bill
    if (action === 'apply-offer') {
      const validation = validateApplyOffer(details);
      if (validation.error) {
        return validation;
      }
    }

    const approvalId = generateApprovalId();
    const request = {
      id: approvalId,
      service: service,
      action: action,
      status: 'pending',
      details: details || {},
      createdAt: new Date()
    };

    pending.set(approvalId, request);
    return request;
  }

  /**
   * Approves a pending approval by ID
   * @param {Object} gate - The approval gate instance
   * @param {string} approvalId - The approval ID
   * @returns {{success: true, approval: Object}|{error: true, message: string}}
   */
  function approve(gate, approvalId) {
    let approval = gate.pending.get(approvalId);
    
    // Check if already in applied (previously approved or rejected)
    if (!approval) {
      approval = gate.applied.find(a => a.id === approvalId);
      if (approval) {
        return {
          error: true,
          message: `Approval ${approvalId} has already been ${approval.status}`
        };
      }
    }

    if (!approval) {
      return {
        error: true,
        message: `Unknown approval ID: ${approvalId}`
      };
    }

    if (approval.status !== 'pending') {
      return {
        error: true,
        message: `Approval ${approvalId} has already been ${approval.status}`
      };
    }

    approval.status = 'approved';
    gate.applied.push(approval);
    gate.pending.delete(approvalId);
    return { success: true, approval: approval };
  }

  /**
   * Rejects a pending approval by ID
   * @param {Object} gate - The approval gate instance
   * @param {string} approvalId - The approval ID
   * @returns {{success: true, approval: Object}|{error: true, message: string}}
   */
  function reject(gate, approvalId) {
    let approval = gate.pending.get(approvalId);
    
    // Check if already in applied (previously approved or rejected)
    if (!approval) {
      approval = gate.applied.find(a => a.id === approvalId);
      if (approval) {
        return {
          error: true,
          message: `Approval ${approvalId} has already been ${approval.status}`
        };
      }
    }

    if (!approval) {
      return {
        error: true,
        message: `Unknown approval ID: ${approvalId}`
      };
    }

    if (approval.status !== 'pending') {
      return {
        error: true,
        message: `Approval ${approvalId} has already been ${approval.status}`
      };
    }

    approval.status = 'rejected';
    gate.applied.push(approval);
    gate.pending.delete(approvalId);
    return { success: true, approval: approval };
  }

  /**
   * Executes the executor function only if the approval is approved
   * @param {Object} gate - The approval gate instance
   * @param {string} approvalId - The approval ID
   * @param {Function} executor - Async function to execute if approved
   * @returns {Promise<any|{error: true, message: string}>}
   */
  async function executeIfApproved(gate, approvalId, executor) {
    // Check both pending and applied
    let approval = gate.pending.get(approvalId);
    if (!approval) {
      // Check applied array
      approval = gate.applied.find(a => a.id === approvalId);
    }

    if (!approval) {
      return {
        error: true,
        message: `Unknown approval ID: ${approvalId}`
      };
    }

    if (approval.status !== 'approved') {
      return {
        error: true,
        message: `Approval ${approvalId} is not approved (status: ${approval.status})`
      };
    }

    try {
      const result = await executor();
      return result;
    } catch (err) {
      return {
        error: true,
        message: `Executor failed: ${err.message || 'Unknown error'}`
      };
    }
  }

  /**
   * Validates the action and executes approved action
   * Validates action is not forbidden, records approval, then runs executor
   * @param {Object} gate - The approval gate instance
   * @param {string} service - The service name
   * @param {string} action - The action to perform
   * @param {Object} details - Additional details
   * @param {Function} executor - Async function to execute
   * @returns {Promise<any|{error: true, message: string}>}
   */
  async function executeApproved(gate, service, action, details, executor) {
    // Validate action is not forbidden FIRST
    if (isForbidden(action)) {
      return {
        error: true,
        message: 'A cancellation can never be confirmed, with or without approval.'
      };
    }

    // Record the explicit approval
    const approval = gate.requestApproval(service, action, details);

    if (approval.error) {
      return approval;
    }

    // Immediately mark as approved for executeApproved
    approval.status = 'approved';
    gate.applied.push(approval);

    // Run executor
    try {
      const result = await executor();
      return result;
    } catch (err) {
      return {
        error: true,
        message: `Executor failed: ${err.message || 'Unknown error'}`
      };
    }
  }

  /**
   * Lists all pending approvals
   * @param {Object} gate - The approval gate instance
   * @returns {Array}
   */
  function listPending(gate) {
    return Array.from(gate.pending.values()).filter(a => a.status === 'pending');
  }

  /**
   * Lists all applied (approved or rejected) approvals
   * @param {Object} gate - The approval gate instance
   * @returns {Array}
   */
  function listApplied(gate) {
    return [...gate.applied];
  }

  // Create gate instance
  const gate = {
    pending,
    applied,
    approvalCounter,
    requestApproval,
    approve,
    reject,
    executeIfApproved,
    executeApproved,
    listPending,
    listApplied
  };

  return gate;
}

module.exports = {
  createGate
};
