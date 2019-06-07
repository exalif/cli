const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
chai.use(require('sinon-chai'));

const { command, desc, builder } = require('../../lib/cmds/remove');

let yargsStub;

const COMMAND = 'remove <command>';
const COMMAND_DESC = 'Remove commands!';
const COMMAND_DIR = 'remove_cmds';

describe('remove', () => {
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
