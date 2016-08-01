
import intersect from 'intersect';
import _ from 'lodash';

var mongodb = require('mongodb');
var Parse = require('parse/node').Parse;

var SchemaController = require('./SchemaController');

const deepcopy = require('deepcopy');

function DatabaseController(adapter) {
  this.adapter = adapter;
  this.schemaPromise = null;
}


DatabaseController.prototype.loadSchema = function() {
  if (!this.schemaPromise) {
    this.schemaPromise = SchemaController.load(this.adapter);
    this.schemaPromise.then(() => delete this.schemaPromise);
  }
  return this.schemaPromise;
}


module.exports = DatabaseController;