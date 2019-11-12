'use strict';

const yargs = require('yargs');

/**
 * Command Processor
 */

module.exports = class CommandProcessor {
  constructor() { }

  /***
   * Parse Args and start CLI logic
   */

  parseArgs() {
    yargs
      .strict()
      .env('EXALIF') // Prefix for environment-provided values. e.g: EXALIF_ORCHESTRATOR_ACCESS_KEY will become orchestrator-access-key
      .commandDir('cmds')
      .demandCommand()
      .option('orchestrator-url', {
        description: 'Orchestrator full URL',
        string: true,
        global: true,
        demandOption: true
      })
      .option('orchestrator-access-key', {
        description: 'Orchestrator access key',
        string: true,
        global: true,
        demandOption: true
      })
      .option('orchestrator-secret-key', {
        description: 'Orchestrator secret key',
        string: true,
        global: true,
        demandOption: true
      })
      .option('project-id', {
        description: 'Project ID',
        string: true,
        global: true
      })
      .option('unique-id', {
        description: 'Unique ID',
        string: true,
        global: true,
        demandOption: false
      })
      .option('verbose', {
        description: 'Activate verbose output',
        boolean: true,
        global: true,
        default: false
      })
      .fail((msg, err, yargs) => {
        if (err) throw err

        console.error(msg);
        console.error('Ye broke it! Ye shoud be doin\' : \n\n', yargs.help());

        process.exit(1);
      })
      .group([
        'orchestrator-url',
        'orchestrator-access-key',
        'orchestrator-secret-key',
        'project-id',
        'unique-id',
        'image',
        'ingress',
        'imagesList'
      ], 'Orchestrator:')
      .epilog(`for detailed usage information, see https://github.com/exalif/cli`)
      .help('help')
      .wrap(yargs.terminalWidth())
      .argv;
  }
}
