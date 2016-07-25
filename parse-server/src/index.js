import ParseServer from './ParseServer';


let _ParseServer = function(options) {
  let server = new ParseServer(options);
  return server.app;
}


export { _ParseServer as ParseServer};