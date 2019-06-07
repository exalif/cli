const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
chai.use(require('sinon-chai'));

const { command, describe: desc, builder, handler } = require('../../../lib/cmds/remove_cmds/namespace');
const RancherNamespaceUtils = require('../../../lib/rancher/namespace');

let sandbox, yargsStub, rancherNamespaceUtilsStub, processStub, consoleStub;

const COMMAND = 'ns <namespace>';
const COMMAND_DESC = 'Remove a namespace';
const COMMAND_USAGE = `remove ns <namespace>

DESCRIPTION:
Remove a given namespace.`;

describe('remove namespace', () => {
  it('should have proper command', () => {
    expect(command).to.equal(COMMAND);
  });

  it('should have proper command description', () => {
    expect(desc).to.equal(COMMAND_DESC);
  });

  describe('builder', () => {
    beforeEach(() => {
      sandbox = sinon.createSandbox();
      yargsStub = {
        usage: sandbox.stub()
      };

      builder(yargsStub);
    });

    afterEach(() => {
      sandbox.restore();
    })

    it('should define usage text', () => {
      expect(yargsStub.usage).to.have.been.calledWith(COMMAND_USAGE);
    });
  });

  describe('handler', () => {
    describe('when promise is resolved', () => {
      beforeEach(() => {
        sandbox = sinon.createSandbox();
        rancherNamespaceUtilsStub = sandbox.stub(RancherNamespaceUtils.prototype, 'removeNamespace').callsFake(() => Promise.resolve('some text'));
        consoleStub = sandbox.stub(console, 'log');
      });

      afterEach(() => {
        RancherNamespaceUtils.prototype.removeNamespace.restore();
        sandbox.restore();
      });

      it('should call remove Namespace and print success message', async () => {
        await handler({});

        expect(rancherNamespaceUtilsStub).to.have.been.called;
        expect(console.log).to.have.been.calledWith('Namespace was removed');
      });
    });

    describe('when promise is errored', () => {
      beforeEach(() => {
        sandbox = sinon.createSandbox();
        rancherNamespaceUtilsStub = sandbox.stub(RancherNamespaceUtils.prototype, 'removeNamespace').rejects('rejected');
        processStub = sandbox.stub(process, 'exit');
        consoleStub = sandbox.stub(console, 'error');
      });

      afterEach(() => {
        sandbox.restore();
      });

      it('should call remove Namespace and log the error before exiting', async () => {
        await handler({});

        expect(rancherNamespaceUtilsStub).to.have.been.called;
        expect(console.error.getCall(0).args[0]).to.contain('Namespace was not removed');
        expect(console.error.getCall(1).args[0].toString()).to.equal('rejected');
        expect(process.exit).to.have.been.calledWith(1);
      });
    });
  });
});
