'use strict';

require('dotenv').config();

const Init = require('./lib/init');

//
//  Start the app
//
const init = new Init();
init.startApp();
