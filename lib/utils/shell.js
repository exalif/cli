'use strict';

let spawn = require('child-process-promise').spawn;

class Shell {
  run(cmd, args = [], allowFailurePattern = null) {
    // console.log('Shell debug', cmd, args);

    if (!cmd) {
      return Promise.reject(`Command cannot be empty`);
    }

    return new Promise(async (resolve, reject) => {
      let command = spawn(cmd, args, { capture: [ 'stdout', 'stderr' ]});
      let childProcess = command.childProcess;
      let result = '';
      let errorFromCommand = '';

      childProcess.stdout.on('data', (data) => {
        result += data.toString();
      });

      childProcess.stderr.on('data', (data) => {
        console.error('Shell debug', data.toString());
        errorFromCommand += data.toString();
      });

      try {
        const res = await command;
        resolve(result);
      } catch (err) {
        if (err.code && err.code === 'ENOENT') {
          reject(`Command "${cmd}" not found`);
        } else {
          console.log(errorFromCommand)
          if (!!allowFailurePattern) {
            const pattern = new RegExp(allowFailurePattern, 'gi');

            if (pattern.test(errorFromCommand)) {
              resolve('Allowed failure: ' + allowFailurePattern);
            } else {
              reject('Exec err ' + err.name + ' ' + errorFromCommand);
            }
          } else {
            reject('Exec err ' + err.name + ' ' + errorFromCommand);
          }
        }
      }
    });
  }
}

module.exports = new Shell();
