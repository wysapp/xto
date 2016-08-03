
import * as CSRFManager from 'lib/CSRFManager';
import encodeFormData from 'lib/encodeFormData';
import { Promise } from 'parse';

let basePath = '';
export function setBasePath(newBasePath) {
  basePath = newBasePath || '';
  if(basePath.endsWith('/')) {
    basePath = basePath.slice(0, basePath.length -1);
  }
}

export function request(method, url, body, abortable = false, withCredentials = true, useRequestedWith = true) {
  if (!url.startsWith('http://')
      && !url.startsWith('https://')
      && basePath.length
      && !url.startsWith(basePath + '/')) {
        url = basePath + url;
      } 
  
  let xhr = new XMLHttpRequest();
  xhr.open(method, url, true) ;
  if(method === 'POST' || method === 'PUT' || method === 'DELETE') {
    xhr.setRequestHeader('X-CSRF-Token', CSRFManager.getToken());
  }
  if (useRequestedWith) {
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
  }
  xhr.withCredentials = withCredentials;
  let p = new Promise();
  
  xhr.onerror = (e) => {
    p.reject({
      success: false,
      message: 'Network Error',
      error: 'Network Error',
      errors: ['Network Error'],
      notice: 'Network Error',
    });
  };

  xhr.onload = function(e) {
    if ( this.status === 200) {
      let json = {};
      try {
        json = JSON.parse(this.responseText);
      } catch(ex) {
        p.reject(this.responseText);
        return;
      }

      if ( json.hasOwnProperty('success') && json.success === false ) {
        p.reject(json);
      } else {
        p.resolve(json);
      }
    } else if (this.status === 403) {
      p.reject({
        success: false,
        message: 'Permission Deined',
        error: 'Permission Deined',
        errors: ['Permission Deined'],
        notice: 'Permission Deined',
      });
    } else if (this.status >= 400 && this.status < 500) {
      let json = {};
      try {
        json = JSON.parse(this.responseText);

      }catch(ex) {
        p.reject(this.responseText);
        return;
      }

      let message = json.message || json.error || json.notice || 'Request Error';
      p.reject({
        success: false,
        message: message,
        error: message,
        errors: json.errors || [message],
        notice: message,
      });
    } else if(this.status >= 500) {
      p.reject({
        success: false,
        message: 'Server Error',
        error: 'Server Error',
        errors: ['Server Error'],
        notice: 'Server Error',
      });
    }
  };

  if ( typeof body === 'object') {
    if (body instanceof FormData) {
      xhr.send(body);
    } else {
      xhr.setRequestHeader(
        'Content-Type',
        'application/x-www-form-urlencoded; charset=UTF-8'
      );

      let formData = [];
      for (let k in body) {
        formData.push(encodeFormData(k, body[k]));
      }
      xhr.send(formData.join('&'));
    }
  } else {
    xhr.send(body);
  }

  if (abortable) {
    return {
      xhr,
      promise: p
    }
  }

  return p;
}


export function get(url) {
  return request('GET', url);
}