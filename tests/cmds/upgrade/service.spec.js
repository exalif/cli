const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
chai.use(require('sinon-chai'));

const { command, describe: desc, builder, handler } = require('../../../lib/cmds/upgrade_cmds/service');
const RancherSingleServiceUtils = require('../../../lib/rancher/service');

let sandbox, yargsStub, optionStub, rancherSingleServiceUtilsStub, processStub, consoleStub;

const COMMAND = 'service <service> of <namespace>';
const COMMAND_DESC = 'Upgrade a service';
const COMMAND_USAGE = `upgrade service <service> of <namespace>

DESCRIPTION:
Upgrade a service (k8s deployment) on a given namespace. If service doesn't exist, it will fail.`;

const OPTIONS = [
  { name: 'force', options: { alias: ['f'], describe: 'force upgrade even if state is not active', default: false, boolean: true } },
  { name: 'image', options: { description: 'Image to use during upgrade', string: true, global: true, demandOption: false } },
]

describe('upgrade service', () => {
  it('should have proper command', () => {
    expect(command).to.equal(COMMAND);
  });

  it('should have proper command description', () => {
    expect(desc).to.equal(COMMAND_DESC);
  });

  describe('builder', () => {
    beforeEach(() => {
      sandbox = sinon.createSandbox();
      optionStub = sandbox.stub().returnsThis();
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

    it('should define options texts', () => {
      OPTIONS.forEach((val, index) => {
        expect(optionStub.getCall(index).args[0]).to.equal(val.name)
        expect(optionStub.getCall(index).args[1]).to.deep.equal(val.options)
      });
    });
  });

  describe('handler', () => {
    describe('when promise is resolved', () => {
      beforeEach(() => {
        sandbox = sinon.createSandbox();
        rancherSingleServiceUtilsStub = sandbox.stub(RancherSingleServiceUtils.prototype, 'upgradeService').callsFake(() => Promise.resolve('some text'));
        consoleStub = sandbox.stub(console, 'log');
      });

      afterEach(() => {
        RancherSingleServiceUtils.prototype.upgradeService.restore();
        sandbox.restore();
      });

      it('should call upgrade service and print success message', async () => {
        await handler({});

        expect(rancherSingleServiceUtilsStub).to.have.been.called;
        expect(console.log).to.have.been.calledWith('Service upgraded');
      });
    });

    describe('when promise is errored', () => {
      beforeEach(() => {
        sandbox = sinon.createSandbox();
        rancherSingleServiceUtilsStub = sandbox.stub(RancherSingleServiceUtils.prototype, 'upgradeService').rejects('rejected');
        processStub = sandbox.stub(process, 'exit');
        consoleStub = sandbox.stub(console, 'error');
      });

      afterEach(() => {
        sandbox.restore();
      });

      it('should call upgrade service and log the error before exiting', async () => {
        await handler({});

        expect(rancherSingleServiceUtilsStub).to.have.been.called;
        expect(console.error.getCall(0).args[0]).to.contain('Service was not upgraded');
        expect(console.error.getCall(1).args[0].toString()).to.equal('rejected');
        expect(process.exit).to.have.been.calledWith(1);
      });
    });
  });
});
