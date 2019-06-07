const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
chai.use(require('sinon-chai'));

const { command, desc, builder } = require('../../lib/cmds/exec');

let yargsStub;

const COMMAND = 'exec <command>';
const COMMAND_DESC = 'Exec commands!';
const COMMAND_DIR = 'exec_cmds';

describe('exec', () => {
  it('should have proper command', () => {
    expect(command).to.equal(COMMAND);
  });

  it('should have proper command description', () => {
    expect(desc).to.equal(COMMAND_DESC);
  });

  describe('builder', () => {
    beforeEach(() => {
      yargsStub = {
        commandDir: sinon.stub()
      };

      builder(yargsStub);
    });

    it('should return proper directory', () => {
      expect(yargsStub.commandDir).to.have.been.calledWith(COMMAND_DIR);
    });
  });
});
