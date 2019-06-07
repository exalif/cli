const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
chai.use(require('sinon-chai'));

const { command, describe: desc, builder, handler } = require('../../../lib/cmds/deploy_cmds/ingress');
const RancherIngressUtils = require('../../../lib/rancher/ingress');

let sandbox, yargsStub, optionStub, rancherIngressUtilsStub, processStub, consoleStub;

const COMMAND = 'ingress on <namespace>';
const COMMAND_DESC = 'Deploy an ingress on namespace';
const COMMAND_USAGE = `deploy ingress on <namespace>

DESCRIPTION:
Deploy an ingress in a given namespace.

Required: EXALIF_INGRESS environment variable`;
const OPTION_DESCRIPTION = '[JSON Object] Ingress to deploy with ingress command';

describe('deploy ingress', () => {
  it('should have proper command', () => {
    expect(command).to.equal(COMMAND);
  });

  it('should have proper command description', () => {
    expect(desc).to.equal(COMMAND_DESC);
  });

  describe('builder', () => {
    beforeEach(() => {
      sandbox = sinon.createSandbox();
      optionStub = sandbox.stub();
      yargsStub = {
        usage: sandbox.stub().callsFake(() => ({ option: optionStub }))
      };

      builder(yargsStub);
    });

    afterEach(() => {
      sandbox.restore();
    })

    it('should define usage text', () => {
      expect(yargsStub.usage).to.have.been.calledWith(COMMAND_USAGE);
    });

    it('should define options text', () => {
      expect(optionStub).to.have.been.calledWith('ingress', {
        description: OPTION_DESCRIPTION,
        string: true,
        global: true,
        demandOption: true
      });
    });
  });

  describe('handler', () => {
    describe('when promise is resolved', () => {
      beforeEach(() => {
        sandbox = sinon.createSandbox();
        rancherIngressUtilsStub = sandbox.stub(RancherIngressUtils.prototype, 'deployIngress').callsFake(() => Promise.resolve('some text'));
        consoleStub = sandbox.stub(console, 'log');
      });

      afterEach(() => {
        RancherIngressUtils.prototype.deployIngress.restore();
        sandbox.restore();
      });

      it('should call deploy Ingress and print success message', async () => {
        await handler({});

        expect(rancherIngressUtilsStub).to.have.been.called;
        expect(console.log).to.have.been.calledWith('Ingress was deployed');
      });
    });

    describe('when promise is errored', () => {
      beforeEach(() => {
        sandbox = sinon.createSandbox();
        rancherIngressUtilsStub = sandbox.stub(RancherIngressUtils.prototype, 'deployIngress').rejects('rejected');
        processStub = sandbox.stub(process, 'exit');
        consoleStub = sandbox.stub(console, 'error');
      });

      afterEach(() => {
        sandbox.restore();
      });

      it('should call deploy Ingress and log the error before exiting', async () => {
        await handler({});

        expect(rancherIngressUtilsStub).to.have.been.called;
        expect(console.error.getCall(0).args[0]).to.contain('Ingress was not deployed');
        expect(console.error.getCall(1).args[0].toString()).to.equal('rejected');
        expect(process.exit).to.have.been.calledWith(1);
      });
    });
  });
});
