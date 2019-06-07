'use strict';

const style = require('ansi-styles');

const wait = require('./wait').wait;
const leaf = require('./utils').leaf;

module.exports = class Retry {
  static async retryTaskUntilExpectedValue({
    task,
    expectedType = 'json',
    expectedKeys,
    expectedValues,
    maxRetries = 10,
    timeout = 10,
    spinner = null,
    initialWaitDelay = null,
  }) {
    // Define proper message display method
    let printFn = console.log;
    if (spinner !== null) {
      printFn = spinner.text;
    }

    if (initialWaitDelay && typeof initialWaitDelay === 'number') {
      printFn(`${style.cyan.open}Waiting for command dispatch${style.cyan.close}`);
      await wait(initialWaitDelay);
    }

    // Proceed retries
    for (let i = 1; i <= maxRetries; i++) {
      try {
        let result = await task();
        let allExpectedValuesCorrect = true;

        // Handle different types of expectations
        if (expectedType === 'json') {
          result = JSON.parse(result);
        }

        if (!!expectedKeys && expectedKeys.length > 0 && expectedKeys.length === expectedValues.length ) {
          expectedKeys.forEach((key, index) => {
            const receivedValue = leaf(result, key).toString();
            const expectedValue = expectedValues[index].toString();

            if (receivedValue !== expectedValue) {
              allExpectedValuesCorrect = false;
            }
          });
        }

        // Check if expected value matches result
        if (allExpectedValuesCorrect) {
          return Promise.resolve('OK');
        } else if (i < maxRetries) {
          printFn(`State differs from expected one`);
          await wait(1000);

          printFn(`Waiting ${timeout}s before retry (${i})`);
          await wait(timeout * 1000);

          continue;
        } else {
          return Promise.resolve(`NOK`);
        }
      } catch (err) {
        throw Error(`ERROR: Unexpected error while running retried task`);
      }
    }
  };
}
