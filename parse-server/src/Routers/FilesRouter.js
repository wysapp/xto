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
    const filesController = config.filesController;
    const filename = req.params.filename;
    const contentType = mime.lookup(filename);
    
    if (isFileStreamable(req, filesController)) {
      filesController.getFileStream(config, filename).then((stream) => {
        handleFileStream(stream, req, res, contentType);
      }).catch(() => {
        res.status(404);
        res.set('Content-Type', 'text/plain');
        res.end('File not found.');
      });
    } else {
      filesController.getFileData(config, filename).then((data)=> {
        res.status(200);
        res.set('Content-Type', contentType);
        res.set('Content-Length', data.length);
        res.end(data);
      }).catch(() => {
        res.status(404);
        res.set('Content-Type', 'text/plain');
        res.end('File not found.');
      });
    }

  }

  createHandler(req, res, next) {
    if (!req.body || !req.body.length) {
      next(new Parse.Error(Parse.Error.FILE_SAVE_ERROR, 'Invalid file upload.'));
      return;
    }

    if (req.params.filename.length > 128) {
      next(new Parse.Error(Parse.Error.INVALID_FILE_NAME, 'Filename too long.'));
      return;
    }

    if (!req.params.filename.match(/^[_a-zA-Z0-9][a-zA-Z0-9@\.\ ~_-]*$/)) {
      next(new Parse.Error(Parse.Error.INVALID_FILE_NAME, 'Filename contains invalid characters.'));
      return;
    }

    const filename = req.params.filename;
    const contentType = req.get('Content-Type');
    const config = req.config;

    const filesController = config.filesController;

    filesController.createFile(config, filename, req.body, contentType).then((result) => {
      
      res.status(201);
      res.set('Location', result.url);
      res.json(result);
    }).catch((e) => {
      logger.error(e.message, e);
      next(new Parse.Error(Parse.Error.FILE_SAVE_ERROR, 'Could not store file.'));
    });
  }

  deleteHandler(req, res, next) {
  }
}


function isFileStreamable(req, filesController) {
  if (req.get('Range')) {
    if (!(typeof filesController.adapter.getFileStream === 'function')) {
      return false;
    }

    if (typeof filesController.adapter.constructor.name !== 'undefined') {
      if (filesController.adapter.constructor.name == 'GridStoreAdapter') {
        return true;
      }
    }
  }

  return false;
}


// handleFileStream is licenced under Creative Commons Attribution 4.0 International License (https://creativecommons.org/licenses/by/4.0/).
// Author: LEROIB at weightingformypizza (https://weightingformypizza.wordpress.com/2015/06/24/stream-html5-media-content-like-video-audio-from-mongodb-using-express-and-gridstore/).



