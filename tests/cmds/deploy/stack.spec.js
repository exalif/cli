const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
chai.use(require('sinon-chai'));

const { command, describe: desc, builder, handler } = require('../../../lib/cmds/deploy_cmds/stack');
const RancherStackUtils = require('../../../lib/rancher/stack');

let sandbox, yargsStub, optionStub, rancherStackUtilsStub, processStub, consoleStub;

const COMMAND = 'stack on <namespace> [options]';
const COMMAND_DESC = 'Deploy a stack from yaml file on namespace';
const COMMAND_USAGE = `deploy stack on <namespace> [options]

DESCRIPTION:
Deploy a stack in a given namespace. The namespace will be created if it doesn't exist.

Required: EXALIF_STACK_FILE environment variable`;

const OPTIONS = [
  { name: 'stackFile', options: { description: 'yaml stack file url', string: true, global: true, demandOption: true } },
  { name: 'ingress', options: { description: '[JSON Object] Ingress data in case a stack contains ingress type', string: true, global: true, demandOption: false } },
  { name: 'image', options: { description: 'Image to use during deploy', default: 'latest', string: true, global: true, demandOption: false } },
  { name: 'create-non-existing-namespace', options: { alias: ['cn'], describe: 'Create namespace if it doesn\'t exist', default: true, global: true, boolean: true } },
  { name: 'copy-certificate-from-namespace', options: { alias: ['cert-from', 'cf'], describe: 'Copy SSL certificate from other namespace', default: null, string: true, global: true, implies: 'ingress' } },
];

describe('deploy stack', () => {
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
        rancherStackUtilsStub = sandbox.stub(RancherStackUtils.prototype, 'deployStack').callsFake(() => Promise.resolve('some text'));
        consoleStub = sandbox.stub(console, 'log');
      });

      afterEach(() => {
        RancherStackUtils.prototype.deployStack.restore();
        sandbox.restore();
      });

      it('should call deploy Stack and print success message', async () => {
        await handler({});

        expect(rancherStackUtilsStub).to.have.been.called;
        expect(console.log).to.have.been.calledWith('Stack was deployed');
      });
    });

    describe('when promise is errored', () => {
      beforeEach(() => {
        sandbox = sinon.createSandbox();
        rancherStackUtilsStub = sandbox.stub(RancherStackUtils.prototype, 'deployStack').rejects('rejected');
        processStub = sandbox.stub(process, 'exit');
        consoleStub = sandbox.stub(console, 'error');
      });

      afterEach(() => {
        sandbox.restore();
      });

      it('should call deploy Stack and log the error before exiting', async () => {
        await handler({});

        expect(rancherStackUtilsStub).to.have.been.called;
        expect(console.error.getCall(0).args[0]).to.contain('Stack was not deployed');
        expect(console.error.getCall(1).args[0].toString()).to.equal('rejected');
        expect(process.exit).to.have.been.calledWith(1);
      });
    });
  });
});
