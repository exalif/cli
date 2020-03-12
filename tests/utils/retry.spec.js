'use strict';

const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
chai.use(require('sinon-chai'));
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const style = require('ansi-styles');

let proxyquireStrict = require('proxyquire').noCallThru();

let sandbox, waitStub, retry, successfulCommand, failedCommand, consoleStub, leafStub, spinnerStub, spinnerTextStub, successfulCommandNoJson;

const SUCCESSFUL_RESPONSE = { status: 'status value', payload: 'payload value', deep: { key: 'deep.key value' } };
const SUCCESSFUL_CHECKS = {
  status: SUCCESSFUL_RESPONSE.status,
  payload: SUCCESSFUL_RESPONSE.payload,
  'deep.key': SUCCESSFUL_RESPONSE.deep.key,
};
const ERROR_CHECKS = {
  status: SUCCESSFUL_RESPONSE.status,
  payload: SUCCESSFUL_RESPONSE.payload,
  noExistingKey: 'someErroredValue',
};

const DEFAULT_TIMEOUT = 10;
const MODIFIED_TIMEOUT = 2;

describe('retry class', () => {
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    leafStub = sandbox.stub().callsFake((result, key) => {
      return key + ' value';
    });

    consoleStub = sandbox.stub(console, 'log');
    spinnerTextStub = sandbox.stub();
    spinnerStub = {
      text: spinnerTextStub
    };
    waitStub = sandbox.stub().resolves();
    failedCommand = sandbox.stub().rejects('someError');
    successfulCommand = sandbox.stub().resolves(JSON.stringify(SUCCESSFUL_RESPONSE));
    successfulCommandNoJson = sandbox.stub().resolves('no JSON result');

    retry = proxyquireStrict('../../lib/utils/retry', {
      './wait': {
        wait: waitStub
      },
      './utils': {
        leaf: leafStub
      }
    });
  });

  afterEach(() => {
    sandbox.restore();
    retry = require('../../lib/utils/retry');
  });

  describe('when initial delay is provided', () => {
    describe('when there is no spinner object', () => {
      it('should print waiting message and wait for appropriate time', async () => {
        const retryRun = retry.retryTaskUntilExpectedValue({ task: successfulCommand, initialWaitDelay: 1 });

        await retryRun;

        expect(consoleStub).to.have.been.calledWith(`${style.cyan.open}Waiting for command dispatch${style.cyan.close}`);
        expect(waitStub).to.have.been.calledWith(1);
      });
    });

    describe('when there is a spinner object', () => {
      it('should print waiting message using spinner text method', async () => {
        const retryRun = retry.retryTaskUntilExpectedValue({ task: successfulCommand, spinner: spinnerStub, initialWaitDelay: 1 });

        await retryRun;

        expect(spinnerTextStub).to.have.been.calledWith(`${style.cyan.open}Waiting for command dispatch${style.cyan.close}`);
      });
    });
  });

  describe('async task', () => {
    describe('when command is errored', () => {
      it('should reject with an error', async () => {
        const maxRetries = 2;
        const retryRun = retry.retryTaskUntilExpectedValue({ task: failedCommand, checks: ERROR_CHECKS, maxRetries, timeout: MODIFIED_TIMEOUT });

        await expect(retryRun).to.eventually.be.rejectedWith(`ERROR: Unexpected error while running retried task`);
      });
    });

    describe('when there is no checks', () => {
      describe('with default expected type to JSON', () => {
        it('should resolve with OK', async () => {
          const retryRun = retry.retryTaskUntilExpectedValue({ task: successfulCommand });

          await expect(retryRun).to.eventually.become('OK');
          expect(successfulCommand).to.have.callCount(1);
        });
      });

      describe('with empty expected checks array', () => {
        it('should resolve with OK', async () => {
          const retryRun = retry.retryTaskUntilExpectedValue({ task: successfulCommand, checks: [] });

          await expect(retryRun).to.eventually.become('OK');
          expect(successfulCommand).to.have.callCount(1);
        });
      });

      describe('when expected Type is not JSON', () => {
        it('should resolve with OK', async () => {
          const retryRun = retry.retryTaskUntilExpectedValue({ task: successfulCommandNoJson, expectedType: null });

          await expect(retryRun).to.eventually.become('OK');
          expect(successfulCommandNoJson).to.have.callCount(1);
        });
      });
    });

    describe('when there are checks to be performed', () => {
      describe('when result match expected values', () => {
        it('should resolve with OK', async () => {
          const retryRun = retry.retryTaskUntilExpectedValue({ task: successfulCommand, checks: SUCCESSFUL_CHECKS });
          await expect(retryRun).to.eventually.become('OK');
          expect(successfulCommand).to.have.callCount(1);
        });
      });

      describe('when result does not match expected values', () => {
        it('should resolve with NOK', async () => {
          const retryRun = retry.retryTaskUntilExpectedValue({ task: successfulCommand, checks: ERROR_CHECKS });

          await expect(retryRun).to.eventually.become('NOK');
        });

        describe('retry', () => {
          it('should retry 10 times by default', async () => {
            const retryRun = retry.retryTaskUntilExpectedValue({ task: successfulCommand, checks: ERROR_CHECKS });

            await retryRun;

            expect(successfulCommand).to.have.callCount(10);
          });

          it('should retry `maxRetries` times', async () => {
            const retryRun = retry.retryTaskUntilExpectedValue({ task: successfulCommand, checks: ERROR_CHECKS, maxRetries: 2 });

            await retryRun;

            expect(successfulCommand).to.have.callCount(2);
          });

          it('should print proper messages during retries', async () => {
            const maxRetries = 3;
            const retryRun = retry.retryTaskUntilExpectedValue({ task: successfulCommand, checks: ERROR_CHECKS, maxRetries });

            await retryRun;

            expect(consoleStub.getCall(0).args[0]).to.equal(`State differs from expected one`);
            expect(consoleStub.getCall(1).args[0]).to.equal(`Waiting ${DEFAULT_TIMEOUT}s before retry (1)`);
            expect(consoleStub.getCall(2).args[0]).to.equal(`State differs from expected one`);
            expect(consoleStub.getCall(3).args[0]).to.equal(`Waiting ${DEFAULT_TIMEOUT}s before retry (2)`);
          });

          describe('wait between retries', () => {
            it('should wait two times between messages', async () => {
              const maxRetries = 2;
              const retryRun = retry.retryTaskUntilExpectedValue({ task: successfulCommand, checks: ERROR_CHECKS, maxRetries });

              await retryRun;

              expect(consoleStub.getCall(0).args[0]).to.equal(`State differs from expected one`);
              expect(consoleStub.getCall(1).args[0]).to.equal(`Waiting ${DEFAULT_TIMEOUT}s before retry (1)`);
              expect(waitStub).to.have.callCount(2);
              expect(waitStub.getCall(0).args[0]).to.equal(1000);
              expect(waitStub.getCall(1).args[0]).to.equal(DEFAULT_TIMEOUT * 1000);
            });

            describe('with custom timeout', () => {
              it('should wait proper time', async () => {
                const maxRetries = 2;
                const retryRun = retry.retryTaskUntilExpectedValue({ task: successfulCommand, checks: ERROR_CHECKS, maxRetries, timeout: MODIFIED_TIMEOUT });

                await retryRun;

                expect(consoleStub.getCall(0).args[0]).to.equal(`State differs from expected one`);
                expect(consoleStub.getCall(1).args[0]).to.equal(`Waiting ${MODIFIED_TIMEOUT}s before retry (1)`);
                expect(waitStub).to.have.callCount(2);
                expect(waitStub.getCall(0).args[0]).to.equal(1000);
                expect(waitStub.getCall(1).args[0]).to.equal(MODIFIED_TIMEOUT * 1000);
              });
            });
          });
        });
      });
    });
  });
});
