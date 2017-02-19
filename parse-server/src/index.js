import ParseServer from './ParseServer';
import {getLogger } from './logger';

const _ParseServer = function(options) {
  const server = new ParseServer(options);
  return server.app;
}

Object.defineProperty(module.exports, 'logger', {
  get: getLogger
});

export default ParseServer;
export {_ParseServer as ParseServer};