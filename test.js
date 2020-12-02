'use strict'

var realmEmitter = require('./')
var test = require('tape').test
var abstractTests = require('mqemitter/abstractTest.js')

abstractTests({
  builder: realmEmitter,
  test: test
})
