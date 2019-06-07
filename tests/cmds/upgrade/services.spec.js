const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
chai.use(require('sinon-chai'));

const { command, describe: desc, builder, handler } = require('../../../lib/cmds/upgrade_cmds/services');
const RancherMultipleServiceUtils = require('../../../lib/rancher/services');

let sandbox, yargsStub, optionStub, rancherMultipleServiceUtilsStub, processStub, consoleStub;

const COMMAND = 'services of <namespace>';
const COMMAND_DESC = 'Upgrade multiple services';
const COMMAND_USAGE = `upgrade services of <namespace>

DESCRIPTION:
Upgrade multiple services (k8s deployment) on a given namespace. Services are defined using array in environment variables`;

const OPTIONS = [
  { name: 'force', options: { alias: ['f'], describe: 'force upgrade even if state is not active', default: false, boolean: true } },
  { name: 'servicesList', options: { description: '[JSON Array] Services to upgrade during multiple services upgrade', string: true, global: true, demandOption: true } },
  { name: 'imagesList', options: { description: '[JSON Array] Images to use during multiple services upgrade (in the same order than services list)', string: true, global: true, demandOption: false } },
]

describe('upgrade services', () => {
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
        rancherMultipleServiceUtilsStub = sandbox.stub(RancherMultipleServiceUtils.prototype, 'upgradeMultipleServices').callsFake(() => Promise.resolve('some text'));
        consoleStub = sandbox.stub(console, 'log');
      });

      afterEach(() => {
        RancherMultipleServiceUtils.prototype.upgradeMultipleServices.restore();
        sandbox.restore();
      });

      it('should call upgrade services and print success message', async () => {
        await handler({});

        expect(rancherMultipleServiceUtilsStub).to.have.been.called;
        expect(console.log).to.have.been.calledWith('Services upgraded');
      });
    });

    describe('when promise is errored', () => {
      beforeEach(() => {
        sandbox = sinon.createSandbox();
        rancherMultipleServiceUtilsStub = sandbox.stub(RancherMultipleServiceUtils.prototype, 'upgradeMultipleServices').rejects('rejected');
        processStub = sandbox.stub(process, 'exit');
        consoleStub = sandbox.stub(console, 'error');
      });

      afterEach(() => {
        sandbox.restore();
      });

      it('should call upgrade services and log the error before exiting', async () => {
        await handler({});

        expect(rancherMultipleServiceUtilsStub).to.have.been.called;
        expect(console.error.getCall(0).args[0]).to.contain('Services were not upgraded');
        expect(console.error.getCall(1).args[0].toString()).to.equal('rejected');
        expect(process.exit).to.have.been.calledWith(1);
      });
    });
  });
});
