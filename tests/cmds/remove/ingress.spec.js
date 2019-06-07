const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
chai.use(require('sinon-chai'));

const { command, describe: desc, builder, handler } = require('../../../lib/cmds/remove_cmds/ingress');
const RancherIngressUtils = require('../../../lib/rancher/ingress');

let sandbox, yargsStub, rancherIngressUtilsStub, processStub, consoleStub;

const COMMAND = 'ingress <ingress> of <namespace>';
const COMMAND_DESC = 'Remove an ingress of namespace';
const COMMAND_USAGE = `remove ingress <ingress> of <namespace>

DESCRIPTION:
Remove an ingress in a given namespace.`;

describe('remove ingress', () => {
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
        rancherIngressUtilsStub = sandbox.stub(RancherIngressUtils.prototype, 'removeIngress').callsFake(() => Promise.resolve('some text'));
        consoleStub = sandbox.stub(console, 'log');
      });

      afterEach(() => {
        RancherIngressUtils.prototype.removeIngress.restore();
        sandbox.restore();
      });

      it('should call remove Ingress and print success message', async () => {
        await handler({});

        expect(rancherIngressUtilsStub).to.have.been.called;
        expect(console.log).to.have.been.calledWith('Ingress was removed');
      });
    });

    describe('when promise is errored', () => {
      beforeEach(() => {
        sandbox = sinon.createSandbox();
        rancherIngressUtilsStub = sandbox.stub(RancherIngressUtils.prototype, 'removeIngress').rejects('rejected');
        processStub = sandbox.stub(process, 'exit');
        consoleStub = sandbox.stub(console, 'error');
      });

      afterEach(() => {
        sandbox.restore();
      });

      it('should call remove Ingress and log the error before exiting', async () => {
        await handler({});

        expect(rancherIngressUtilsStub).to.have.been.called;
        expect(console.error.getCall(0).args[0]).to.contain('Ingress was not removed');
        expect(console.error.getCall(1).args[0].toString()).to.equal('rejected');
        expect(process.exit).to.have.been.calledWith(1);
      });
    });
  });
});
