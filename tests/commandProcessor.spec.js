const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
chai.use(require('sinon-chai'));
let proxyquireStrict = require('proxyquire').noCallThru();

let sandbox, yargsStub, optionStub, cp;

const OPTIONS = [
  { name: 'orchestrator-url', options: { description: 'Orchestrator full URL', string: true, global: true, demandOption: true } },
  { name: 'orchestrator-access-key', options: { description: 'Orchestrator access key', string: true, global: true, demandOption: true } },
  { name: 'orchestrator-secret-key', options: { description: 'Orchestrator secret key', string: true, global: true, demandOption: true } },
  { name: 'project-id', options: { description: 'Project ID', string: true, global: true } },
  { name: 'unique-id', options: { description: 'Unique ID', string: true, global: true, demandOption: false } },
  { name: 'verbose', options: { description: 'Activate verbose output', boolean: true, global: true, default: false } },
];

describe('command processor', () => {
  beforeEach(() => {
    sandbox = sinon.createSandbox();

    terminalWidthStub = sandbox.stub();
    wrapStub = sandbox.stub().returns({ argv: { any: 'argv' } });
    helpStub = sandbox.stub().callsFake(() => ({ wrap: wrapStub }));
    epilogStub = sandbox.stub().callsFake(() => ({ help: helpStub }));
    groupStub = sandbox.stub().callsFake(() => ({ epilog: epilogStub }));
    failStub = sandbox.stub().callsFake(() => ({ group: groupStub }));
    optionsStub = sandbox.stub().callsFake(() => ({ fail: failStub, option: optionsStub }));
    demandCommandStub = sandbox.stub().callsFake(() => ({ option: optionsStub }));
    commandDirStub = sandbox.stub().callsFake(() => ({ demandCommand: demandCommandStub }));
    envStub = sandbox.stub().callsFake(() => ({ commandDir: commandDirStub }));
    strictStub = sandbox.stub().callsFake(() => ({ env: envStub }));
    yargsStub = {
      strict: strictStub,
      terminalWidth: terminalWidthStub,
      help: helpStub
    };

    commandProcessor = proxyquireStrict('../lib/commandProcessor', {
      yargs: yargsStub
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('parseArgs', () => {
    beforeEach(() => {
      cp = new commandProcessor();
      cp.parseArgs();
    });

    it('should call strict method', () => {
      expect(strictStub).to.have.been.called;
    });

    it('should call env method with proper prefix', () => {
      expect(envStub).to.have.been.calledWith('EXALIF');
    });

    it('should call commandDir method with proper directory', () => {
      expect(commandDirStub).to.have.been.calledWith('cmds');
    });

    it('should call demandCommand method', () => {
      expect(demandCommandStub).to.have.been.called;
    });

    describe('options methods', () => {
      it('should call option method several times', () => {
        expect(optionsStub).to.have.callCount(OPTIONS.length);
        OPTIONS.forEach((val, index) => {
          expect(optionsStub.getCall(index).args[0]).to.equal(val.name)
          expect(optionsStub.getCall(index).args[1]).to.deep.equal(val.options)
        });
      });
    });

    describe('fail method', () => {
      describe('when error is empty', () => {
        beforeEach(() => {
          let fail = failStub.getCall(0).args[0];
          localhelpStub = sandbox.stub().returns('somehelp');
          processStub = sandbox.stub(process, 'exit');
          consoleStub = sandbox.stub(console, 'error');

          fail('some message', null, { help: localhelpStub });
        });

        it('should print error and exit process', () => {
          expect(failStub).to.have.been.called;
          expect(process.exit).to.have.been.calledWith(1);
          expect(localhelpStub).to.have.been.called;
          expect(console.error.getCall(0).args[0]).to.equal('some message');
          expect(console.error.getCall(1).args).to.deep.equal(['Ye broke it! Ye shoud be doin\' : \n\n', 'somehelp']);
        });
      });

      describe('when error is defined', () => {
        beforeEach(() => {
          localhelpStub = sandbox.stub().returns('somehelp');
          processStub = sandbox.stub(process, 'exit');
          consoleStub = sandbox.stub(console, 'error');


        });

        it('should throw error', () => {
          let fail = failStub.getCall(0).args[0];
          const error = new Error('someError');

          expect(function(){fail('some message', error, { help: localhelpStub })}).to.throw(error);
        });
      });
    });
  });
});
