'use strict';

const ora = require('ora');

module.exports = async function withSpinner({ task, textOnStart, textOnSuccess, textOnError, color, spinnerType, shouldAlwaysShowFail = false }) {
  const spinner = ora({
    text: textOnStart,
    color: color || 'cyan',
    spinner: spinnerType || ''
  }).start();

  try {
    const value = await task;

    if (shouldAlwaysShowFail || value === 'NOK') {
      spinner.fail(textOnSuccess(value));
    } else {
      spinner.succeed(textOnSuccess(value));
    }

    return value;
  } catch(err) {
    spinner.fail(textOnError(err));

    return Promise.reject(err);
  }
};
