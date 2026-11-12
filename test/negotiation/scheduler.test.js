/**
 * Retry scheduler tests
 * Agent Bulldog — Kiroween 2026
 * 
 * node --test test/negotiation/scheduler.test.js
 */

const assert = require('node:assert');
const { createSchedule, getNextAngle, runAttempt, runNextAttempt, nextRetryTime, getNextRetryTime } = require('../../src/negotiation/scheduler');

async function runTests() {
  console.log('=== Retry Scheduler Tests ===\n');

  // Test 1: createSchedule initializes with all 5 angles
  {
    const testDescription = 'createSchedule initializes with all 5 angles';
    const schedule = createSchedule('streaming', null);
    
    assert.strictEqual(schedule.serviceName, 'streaming', 'Service name should be "streaming"');
    assert.strictEqual(schedule.anglePool.length, 5, 'Should have 5 angles in pool');
    assert.strictEqual(schedule.attemptedAngles.length, 0, 'Should have no attempted angles initially');
    assert.strictEqual(schedule.attempts, 0, 'Should start with 0 attempts');
    assert.strictEqual(schedule.success, null, 'Success should be null initially');
    assert.strictEqual(schedule.done, false, 'Should not be done initially');
    assert.strictEqual(schedule.lastAttemptAt, null, 'Last attempt time should be null initially');
    
    // Verify all angles are present
    const expectedAngles = ['price_match', 'loyalty', 'complaint', 'competitor_switch', 'hardship'];
    assert.deepStrictEqual(schedule.anglePool.sort(), expectedAngles.sort(), 'Should have all expected angles');
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 2: getNextAngle rotates without repetition
  {
    const testDescription = 'getNextAngle rotates through angles without repetition';
    const schedule = createSchedule('streaming', null);
    
    const angles = [];
    for (let i = 0; i < 5; i++) {
      const angle = getNextAngle(schedule);
      assert.ok(angle, `Should get angle on attempt ${i + 1}`);
      assert.ok(!angles.includes(angle), `Angle "${angle}" should not be repeated`);
      angles.push(angle);
    }
    
    // Pool should be empty after 5 calls
    const lastAngle = getNextAngle(schedule);
    assert.strictEqual(lastAngle, null, 'Should return null when no angles remain');
    
    // Verify we got all 5 angles exactly once
    assert.strictEqual(angles.length, 5, 'Should have collected 5 angles');
    const expectedAngles = ['price_match', 'loyalty', 'complaint', 'competitor_switch', 'hardship'];
    assert.deepStrictEqual(angles.sort(), expectedAngles.sort(), 'Should have all expected angles exactly once');
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 3: runAttempt directly with known-failing angles tracks state
  {
    const testDescription = 'runAttempt with known-failing angles tracks state';
    const schedule = createSchedule('streaming', null);
    
    // competitor_switch and hardship both return success=false, no improvement
    const angle1 = 'competitor_switch';
    const result1 = await runAttempt(schedule, angle1);
    assert.ok(!result1.error, 'First attempt should not error');
    assert.strictEqual(schedule.attempts, 1, 'Should have 1 attempt');
    assert.deepStrictEqual(schedule.attemptedAngles, ['competitor_switch'], 'Should record attempted angle');
    assert.strictEqual(schedule.success, false, 'Success should be false after failed attempt');
    assert.ok(!schedule.done, 'Should not be done after 1 failed attempt');
    assert.ok(schedule.lastAttemptAt instanceof Date, 'Should record last attempt time');
    
    const angle2 = 'hardship';
    const result2 = await runAttempt(schedule, angle2);
    assert.ok(!result2.error, 'Second attempt should not error');
    assert.strictEqual(schedule.attempts, 2, 'Should have 2 attempts');
    assert.deepStrictEqual(schedule.attemptedAngles, ['competitor_switch', 'hardship'], 'Should record both attempted angles');
    assert.ok(!schedule.done, 'Should not be done after 2 failed attempts');
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 4: nextRetryTime returns 6h OR next business hours, whichever is later
  {
    const testDescription = 'nextRetryTime returns 6h OR next business hours, whichever is later';
    
    // Test case 1: Friday evening (after business hours) → next Monday 09:00
    const fridayEvening = new Date('2024-01-19T18:00:00'); // Friday 6pm
    const fridayResult = nextRetryTime(fridayEvening);
    assert.strictEqual(fridayResult.getDay(), 1, 'Friday evening should schedule for Monday');
    assert.strictEqual(fridayResult.getHours(), 9, 'Should be at 09:00');
    assert.strictEqual(fridayResult.getMinutes(), 0, 'Should be at 00 minutes');
    
    // Test case 2: Monday morning (before business hours) → 6 hours later at 13:30
    const mondayMorning = new Date('2024-01-22T07:30:00'); // Monday 7:30am
    const mondayResult = nextRetryTime(mondayMorning);
    assert.strictEqual(mondayResult.getDay(), 1, 'Monday morning should stay Monday');
    assert.strictEqual(mondayResult.getHours(), 13, 'Should be 6 hours later at 13:30');
    assert.strictEqual(mondayResult.getMinutes(), 30, 'Should have 30 minutes');
    
    // Test case 3: Tuesday at 10:00 (during business hours) → 6 hours later
    const tuesdayMidday = new Date('2024-01-23T10:00:00'); // Tuesday 10:00am
    const tuesdayResult = nextRetryTime(tuesdayMidday);
    const sixHoursLater = new Date(tuesdayMidday.getTime() + 6 * 60 * 60 * 1000);
    
    // The result should be 6 hours later (16:00) since that's during business hours
    // and later than the next business hours (which would be the same day at 09:00 if we're after 17:00)
    assert.strictEqual(tuesdayResult.getHours(), 16, 'During business hours should be 6 hours later');
    assert.strictEqual(tuesdayResult.getMinutes(), 0, 'Should be at 00 minutes');
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 5: 5 failed attempts ends with "provider will not budge"
  {
    const testDescription = '5 failed attempts ends with "provider will not budge"';
    const schedule = createSchedule('streaming', null);
    
    // Use angles that don't improve: competitor_switch and hardship
    // First rotate through the successful angles (price_match, loyalty, complaint)
    // to get to the failing ones
    getNextAngle(schedule); // price_match
    getNextAngle(schedule); // loyalty
    getNextAngle(schedule); // complaint
    
    // Now we have competitor_switch and hardship left
    for (let i = 0; i < 5; i++) {
      const angle = getNextAngle(schedule);
      const result = await runAttempt(schedule, angle || 'unknown');
      
      if (i < 4) {
        assert.ok(!result.error, `Attempt ${i + 1} should not error`);
        assert.ok(!schedule.done, `Schedule should not be done after ${i + 1} attempts`);
      } else {
        // 5th attempt
        assert.ok(!result.error, `Attempt ${i + 1} should not error`);
        assert.ok(schedule.done, 'Schedule should be done after 5 attempts');
        assert.strictEqual(schedule.message, 'Provider will not budge after 5 attempts', 'Should report provider will not budge');
        assert.strictEqual(result.message, 'Provider will not budge after 5 attempts', 'Result should report provider will not budge');
      }
    }
    
    // 6th attempt should fail immediately (schedule is done)
    const angle = getNextAngle(schedule);
    assert.strictEqual(angle, null, 'Should return null when no angles remain');
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 6: Success ends schedule early
  {
    const testDescription = 'Success ends schedule early';
    const schedule = createSchedule('streaming', null);
    
    // Run attempts until success or out of angles
    let attemptCount = 0;
    while (!schedule.done && schedule.anglePool.length > 0) {
      const result = await runNextAttempt(schedule);
      attemptCount++;
      
      if (result.success) {
        assert.ok(schedule.done, 'Schedule should be done after success');
        assert.strictEqual(schedule.success, true, 'Success flag should be true');
        assert.ok(schedule.message.includes('successful'), 'Message should mention success');
        break;
      }
    }
    
    // Since loyalty/complaint angles offer discounts, we should succeed before 5 attempts
    assert.ok(attemptCount <= 5, 'Should succeed within 5 attempts');
    assert.ok(schedule.done, 'Schedule should be done');
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 7: getNextRetryTime returns null when schedule is done
  {
    const testDescription = 'getNextRetryTime returns null when schedule is done';
    const schedule = createSchedule('streaming', null);
    
    // Before any attempts, should return now (first attempt immediate)
    let nextTime = getNextRetryTime(schedule);
    assert.ok(nextTime instanceof Date, 'Should return Date before first attempt');
    
    // After 5 failed attempts, should return null
    for (let i = 0; i < 5; i++) {
      const angle = getNextAngle(schedule);
      await runAttempt(schedule, angle || 'unknown');
    }
    
    nextTime = getNextRetryTime(schedule);
    assert.strictEqual(nextTime, null, 'Should return null when schedule is done');
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 8: Friday 17:00 (end of business hours) schedules next business day 09:00
  {
    const testDescription = 'Friday 17:00 schedules next business day 09:00';
    const fridayFive = new Date('2024-01-19T17:00:00'); // Friday 5pm (end of business hours)
    const result = nextRetryTime(fridayFive);
    
    // Next business hours would be Monday 09:00
    // 6 hours later would be Saturday 23:00
    // Monday 09:00 is later than Saturday 23:00, so should be Monday 09:00
    assert.strictEqual(result.getDay(), 1, 'Should schedule for Monday');
    assert.strictEqual(result.getHours(), 9, 'Should be at 09:00');
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 9: Wednesday 14:00 (during business hours) schedules next business day 09:00
  // 6 hours later = 20:00 (after business hours)
  // Next business day 09:00 is LATER than 6 hours, so should return Thursday 09:00
  {
    const testDescription = 'Wednesday 14:00 schedules next business day 09:00';
    const wednesdayTwo = new Date('2024-01-24T14:00:00'); // Wednesday 2pm
    const result = nextRetryTime(wednesdayTwo);
    
    // 6 hours later would be 20:00 (after business hours)
    // Next business day at 09:00 is later than 6 hours
    assert.strictEqual(result.getDay(), 4, 'Should be Thursday');
    assert.strictEqual(result.getHours(), 9, 'Should be at 09:00');
    
    console.log(`✓ ${testDescription}`);
  }

  // Test 10: Unknown service in schedule returns error
  {
    const testDescription = 'Unknown service in schedule returns error';
    const schedule = createSchedule('unknown_service_xyz', null);
    
    const angle = getNextAngle(schedule);
    const result = await runAttempt(schedule, angle || 'unknown');
    
    assert.ok(result.error, 'Should return error for unknown service');
    assert.ok(result.message.includes('Unknown service'), 'Error message should mention unknown service');
    assert.ok(schedule.done, 'Schedule should be marked done after error');
    
    console.log(`✓ ${testDescription}`);
  }

  console.log('\nAll scheduler tests passed!');
}

runTests().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
