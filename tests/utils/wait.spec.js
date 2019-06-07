const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');

const wait = require('../../lib/utils/wait').wait;

var clock;

before(() => {
  clock = sinon.useFakeTimers();
});

after(() => {
  clock.restore();
})

it('should not resolve until given time', async() => {
  const waitTime = 100;
  const failWaitTime = waitTime - 1;
  const promise = wait(waitTime);
  let fulfilled = false;

  promise.then(() => {
    fulfilled = true;
  });

  clock.tick(failWaitTime);
  await Promise.resolve();
  expect(fulfilled).to.be.false;

  clock.tick(waitTime - failWaitTime);
  await Promise.resolve();
  expect(fulfilled).to.be.true;
});
