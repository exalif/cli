'use strict';

const events = require('events');
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
chai.use(require('sinon-chai'));
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

let proxyquireStrict = require('proxyquire').noCallThru();

let sandbox, spawnEvent, spawnStub, shell, childProcessPromise, consoleStub;

const CAPTURE_OPTIONS = { capture: [ 'stdout', 'stderr' ]};
const COMMAND = 'someCommand';
const ARGUMENTS = ['arg1', 'arg2'];
const ERRORED = 'erroredCommand';
const ERROR_STDERR = '404 error which will go to STDERR';

shell = require('../../lib/utils/shell');

describe('shell class', () => {
  beforeEach(() => {
    sandbox = sinon.createSandbox();

    consoleStub = sandbox.stub(console, 'log');

    spawnEvent = new events.EventEmitter();
    spawnEvent.stdout = new events.EventEmitter();
    spawnEvent.stderr = new events.EventEmitter();

    spawnStub = sandbox.stub();

  });

  afterEach(() => {
    sandbox.restore();
    shell = require('../../lib/utils/shell');
  });

  describe('when there is no command', () => {
    it('should return an error', async () => {
      const shellRun = shell.run(null, ARGUMENTS);
      await expect(shellRun).to.eventually.be.rejectedWith('Command cannot be empty');
      expect(spawnStub).not.to.have.been.called;
    });
  });

  describe('when command is successful', () => {
    beforeEach(() => {
      spawnStub.returns({ childProcess: spawnEvent });

      shell = proxyquireStrict('../../lib/utils/shell', {
        'child-process-promise': {
          spawn: spawnStub
        }
      });
    });
    describe('when there is no arguments', () => {
      describe('with null arguments', () => {
        it('should return result', async () => {
          const shellRun = shell.run(COMMAND, null);
          spawnEvent.stdout.emit('data', 'hello world');
          await expect(shellRun).to.eventually.become('hello world');
          expect(spawnStub).to.have.been.calledWith(COMMAND, null, CAPTURE_OPTIONS);
        });
      });

      describe('with no arguments', () => {
        it('should return result', async () => {
          const shellRun = shell.run(COMMAND);
          spawnEvent.stdout.emit('data', 'hello world');
          await expect(shellRun).to.eventually.become('hello world');
          expect(spawnStub).to.have.been.calledWith(COMMAND, [], CAPTURE_OPTIONS);
        });
      });

      describe('with empty array of arguments', () => {
        it('should return result', async () => {
          const shellRun = shell.run(COMMAND, []);
          spawnEvent.stdout.emit('data', 'hello world');
          await expect(shellRun).to.eventually.become('hello world');
          expect(spawnStub).to.have.been.calledWith(COMMAND, [], CAPTURE_OPTIONS);
        });
      });
    });
  });


  describe('when command is not successful', () => {
    describe('when no data is return by command', () => {
      beforeEach(() => {
        spawnStub.returns({ childProcess: spawnEvent });

        shell = proxyquireStrict('../../lib/utils/shell', {
          'child-process-promise': {
            spawn: spawnStub
          }
        });
      });

      it('should return an empty result', async () => {
        const shellRun = shell.run(COMMAND, ARGUMENTS);
        await expect(shellRun).to.eventually.become('');
        expect(spawnStub).to.have.been.calledWith(COMMAND, ARGUMENTS, CAPTURE_OPTIONS);
      });
    });
  });

  describe('when command not found error is emitted on command exec', () => {
    it('should return an empty result', async () => {
      const shellRun = shell.run(ERRORED, ARGUMENTS);

      await expect(shellRun).to.eventually.be.rejectedWith(`Command "${ERRORED}" not found`);
    });
  });

  describe('when other error is emitted on command exec', () => {
    it('should return the error with stderr', async () => {
      const shellRun = shell.run('node', ['tests/scripts/error']);

      await expect(shellRun).to.eventually.be.rejectedWith(ERROR_STDERR);
    });
  });

  describe('when allowFailurePattern is provided', () => {
    describe('when allowed failure is not matched in occured error', () => {
      it('should return an empty result', async () => {
        const shellRun = shell.run('node', ['tests/scripts/error'], '500');

        await expect(shellRun).to.eventually.be.rejectedWith(ERROR_STDERR);
      });
    });

    describe('when allowed failure is matched in occured error', () => {
      it('should resolve with alert message', async () => {
        const shellRun = shell.run('node', ['tests/scripts/error'], '404');

        await expect(shellRun).to.eventually.become('Allowed failure: 404');
      });
    });
  });
});
