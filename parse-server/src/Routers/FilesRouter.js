import express from 'express';
import BodyParse from 'body-parser';
import * as Middlewares from '../middlewares';
import Parse from 'parse/node';
import Config from '../Config';
import mime from 'mime';
import logger from '../logger';

export class FilesRouter {

  expressRouter(options = {}) {
    var router = express.Router();
    router.get('/files/:appId/:filename', this.getHandler);

    router.post('/files', function(req, res, next) {
      next(new Parse.Error(Parse.Error.INVALID_FILE_NAME, 'Filename not provided.'));
    });

    router.post('/files/:filename',
      Middlewares.allowCrossDomain,
      BodyParse.raw({type: ()=>{return true;}, limit: options.maxUploadSize || '20md'}),
      Middlewares.handleParseHeaders,
      this.createHandler
    );

    router.delete('/files/:filename',
      Middlewares.allowCrossDomain,
      Middlewares.handleParseHeaders,
      Middlewares.enforceMasterKeyAccess,
      this.deleteHandler
    );

    return router;
  }

  getHandler(req, res) {
    const config = new Config(req.params.appId);

  }

  createHandler(req, res, next) {

  }

  deleteHandler(req, res, next) {
    
  }
}