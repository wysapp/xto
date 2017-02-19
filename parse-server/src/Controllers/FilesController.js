// FilesController.js

import AdaptableController from './AdaptableController';
import { FilesAdapter } from '../Adapters/Files/FilesAdapter';
import path from 'path';
import mime from 'mime';

const legacyFilesRegex = new RegExp("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}-.*");

export class FilesController extends AdaptableController {

  expectedAdapterType() {
    return FilesAdapter;
  }

}


export default FilesController;