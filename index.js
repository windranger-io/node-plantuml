#!/usr/bin/env node
'use strict'

if (require.main === module) {
  require('./lib/multi-generation')
  // require('./lib/node-plantuml-cmd')
} else {
  module.exports = require('./lib/node-plantuml')
}
