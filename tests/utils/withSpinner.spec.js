'use strict';

const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
chai.use(require('sinon-chai'));
let proxyquireStrict = require('proxyquire').noCallThru();
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

const ora = require('ora');

let withSpinner, sandbox, start, oraStub, failStub, succeedStub;

const TEXT_ON_START = 'some text';
const COLOR = 'orange';
const SPINNER_TYPE = 'some spinner type';
const TEXT_ON_ERROR = (err) => err;
const TEXT_ON_SUCCESS = (text) => text;
const ERROR = 'some error';
const SUCCESS_VALUE = 'some amazing success value';
const NOK_VALUE = 'NOK';

describe('withSpinner class', () => {
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    failStub = sandbox.stub();
    succeedStub = sandbox.stub();
    start = sandbox.stub().callsFake(() => ({
      fail: failStub,
      succeed: succeedStub
    }));
    oraStub = sandbox.stub(ora, 'default').callsFake(() => {
      return {
          start
      }
    });
    withSpinner = proxyquireStrict('../../lib/utils/withSpinner', {
      ora: oraStub
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('init', () => {
    describe('ora setup', () => {
      beforeEach(() => {
        withSpinner({
          textOnStart: TEXT_ON_START,
          color: COLOR,
          spinnerType: SPINNER_TYPE,
          extOnError: TEXT_ON_ERROR,
          textOnSuccess: TEXT_ON_SUCCESS
        });
      });

      it('sould start ora', () => {
        expect(oraStub).to.have.been.calledWith({
          color: COLOR,
          spinner: SPINNER_TYPE,
          text: TEXT_ON_START,
        });
        expect(start).to.have.been.calledAfter(oraStub);
      });
    });

    describe('when task fails', () => {
      let method;

      describe('due to error', () => {
        beforeEach(() => {
          const failingPromise = () => {
            return new Promise(function(resolve, reject) {
              throw(ERROR);
            });
          };

          method = withSpinner({
            textOnStart: TEXT_ON_START,
            task: failingPromise(),
            textOnError: TEXT_ON_ERROR,
            textOnSuccess: TEXT_ON_SUCCESS
          })
        });

        it('should reject the promise ', async () => {
          await expect(method).to.be.rejectedWith(ERROR);

          expect(failStub).to.have.been.calledWith(TEXT_ON_ERROR(ERROR));
        });
      });

      describe('due to rejection', () => {
        beforeEach(() => {
          const failingPromise = () => {
            return new Promise(function(resolve, reject) {
              reject(ERROR);
            });
          };

          method = withSpinner({
            textOnStart: TEXT_ON_START,
            task: failingPromise(),
            textOnError: TEXT_ON_ERROR,
            textOnSuccess: TEXT_ON_SUCCESS
          })
        });

        it('should reject the promise ', async () => {
          await expect(method).to.be.rejectedWith(ERROR);

          expect(failStub).to.have.been.calledWith(TEXT_ON_ERROR(ERROR));
        });
      });
    });

    describe('when task succeeds', () => {
      let method;

      describe('by default', () => {
        beforeEach(() => {
          const successPromise = () => {
            return new Promise(function(resolve, reject) {
              resolve(SUCCESS_VALUE);
            });
          };

          method = withSpinner({
            textOnStart: TEXT_ON_START,
            task: successPromise(),
            textOnError: TEXT_ON_ERROR,
            textOnSuccess: TEXT_ON_SUCCESS
          })
        });

        it('should resolve the promise', async () => {
          await expect(method).to.be.fulfilled;
          await expect(method).to.eventually.become(SUCCESS_VALUE);

        });

        it('should display a success message', async() => {
          const result = await method;
          expect(succeedStub).to.have.been.calledWith(TEXT_ON_SUCCESS(SUCCESS_VALUE))
        });
      });

      describe('when value is NOK', () => {
        beforeEach(() => {
          const successPromise = () => {
            return new Promise(function(resolve, reject) {
              resolve(NOK_VALUE);
            });
          };

          method = withSpinner({
            textOnStart: TEXT_ON_START,
            task: successPromise(),
            textOnError: TEXT_ON_ERROR,
            textOnSuccess: TEXT_ON_SUCCESS
          })
        });

        it('should resolve the promise', async () => {
          await expect(method).to.be.fulfilled;
          await expect(method).to.eventually.become(NOK_VALUE);
        });

        it('should display a failure message', async() => {
          const result = await method;
          expect(failStub).to.have.been.calledWith(TEXT_ON_SUCCESS(NOK_VALUE));
        });
      });

      describe('when it should always show a failure', () => {
        beforeEach(() => {
          const successPromise = () => {
            return new Promise(function(resolve, reject) {
              resolve(SUCCESS_VALUE);
            });
          };

          method = withSpinner({
            textOnStart: TEXT_ON_START,
            task: successPromise(),
            textOnError: TEXT_ON_ERROR,
            textOnSuccess: TEXT_ON_SUCCESS,
            shouldAlwaysShowFail: true
          })
        });

        it('should resolve the promise', async () => {
          await expect(method).to.be.fulfilled;
          await expect(method).to.eventually.become(SUCCESS_VALUE);
        });

        it('should display a failure message', async() => {
          const result = await method;
          expect(failStub).to.have.been.calledWith(TEXT_ON_SUCCESS(SUCCESS_VALUE));
        });
      });
    });
  });
});
