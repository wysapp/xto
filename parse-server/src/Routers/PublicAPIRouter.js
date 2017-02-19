import PromiseRouter from '../PromiseRouter';
import Config from '../Config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import qs from 'querystring';

const public_html = path.resolve(__dirname, "../../public_html");
const views = path.resolve(__dirname, "../../views");

export class PublicAPIRouter extends PromiseRouter {


  changePassword(req) {
    return new Promise((resolve, reject) => {
      const config = new Config(req.query.id);
      if (!config.publicServerURL) {
        return resolve({
          status: 404,
          text: 'Not found.'
        });
      }

      fs.readFile(path.resolve(views, "choose_password"), 'utf-8', (err, data) => {
        if (err) {
          return reject(err);
        }

        data = data.replace("PARSE_SERVER_URL", `'${config.publicServerURL}'`);
        resolve({
          text: data
        })
      });
    });
  }

  setConfig(req) {
    req.config = new Config(req.params.appId);
    return Promise.resolve();
  }

  mountRoutes() {
    this.route('GET', '/apps/:appId/verify_email',
      req => {this.setConfig(req)},
      req => { return this.verifyEmail(req); }
    );

    this.route('GET', '/apps/choose_password', 
      req => { return this.changePassword(req); }
    );

    this.route('POST', '/apps/:appId/request_password_reset',
      req => { this.setConfig(req) },
      req => { return this.resetPassword(req); }
    );

    this.route('GET', '/apps/:appId/request_password_reset',
      req => { this.setConfig(req) },
      req => { return this.requestResetPassword(req); }
    );
  }

  expressRouter() {
    const router = express.Router();
    router.use('/apps', express.static(public_html));
    router.use("/", super.expressRouter());
    return router;
  }
}