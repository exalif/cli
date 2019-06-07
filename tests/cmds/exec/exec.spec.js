const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
chai.use(require('sinon-chai'));

const { command, describe: desc, builder, handler } = require('../../../lib/cmds/exec_cmds/exec');
const RancherExecUtils = require('../../../lib/rancher/exec');

let sandbox, yargsStub, optionStub, rancherExecUtilsStub, processStub, consoleStub;

const COMMAND = 'on <service> of <namespace>';
const COMMAND_DESC = 'Exec a command in a given running service\'s pod';
const COMMAND_USAGE = `on <service> of <namespace>

DESCRIPTION:
Execute a command in a given running service's pod

****CAUTION****: currently this can only be ran on a pod with a single container`;
const OPTION_DESCRIPTION = 'Command to execute on pod';

describe('exec command', () => {
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
      expect(optionStub).to.have.been.calledWith('execCommand', {
        description: OPTION_DESCRIPTION,
        string: true,
        global: false,
        demandOption: true
      });
    });
  });

  describe('handler', () => {
    describe('when promise is resolved', () => {
      beforeEach(() => {
        sandbox = sinon.createSandbox();
        rancherExecUtilsStub = sandbox.stub(RancherExecUtils.prototype, 'runCommand').callsFake(() => Promise.resolve('some text'));
        consoleStub = sandbox.stub(console, 'log');
      });

      afterEach(() => {
        RancherExecUtils.prototype.runCommand.restore();
        sandbox.restore();
      });

      it('should call exec command and print success message', async () => {
        await handler({});

        expect(rancherExecUtilsStub).to.have.been.called;
        expect(console.log).to.have.been.calledWith('Command was executed');
      });
    });

    describe('when promise is errored', () => {
      beforeEach(() => {
        sandbox = sinon.createSandbox();
        rancherExecUtilsStub = sandbox.stub(RancherExecUtils.prototype, 'runCommand').rejects('rejected');
        processStub = sandbox.stub(process, 'exit');
        consoleStub = sandbox.stub(console, 'error');
      });

      afterEach(() => {
        sandbox.restore();
      });

      it('should call run command and log the error before exiting', async () => {
        await handler({});

        expect(rancherExecUtilsStub).to.have.been.called;
        expect(console.error.getCall(0).args[0]).to.contain('Command was not executed');
        expect(console.error.getCall(1).args[0].toString()).to.equal('rejected');
        expect(process.exit).to.have.been.calledWith(1);
      });
    });
  });
});
