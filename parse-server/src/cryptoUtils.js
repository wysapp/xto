/* @flow */

import { randomBytes, createHash } from 'crypto';

export function randomHexString(size: number): string {
  if (size === 0) {
    throw new Error('Zero-length randomHexString is useless.');
  }

  if (size % 2 !== 0) {    
    throw new Error('randomHexString size must be divisible by 2.')
  }

  return randomBytes(size /2 ).toString('hex');
}


// Returns a new random alphanumeric string of the given size.
//
// Note: to simplify implementation, the result has slight modulo bias,
// because chars length of 62 doesn't divide the number of all bytes
// (256) evenly. Such bias is acceptable for most cases when the output
// length is long enough and doesn't need to be uniform.
export function randomString(size: number): string {
  if (size === 0) {
    throw new Error('Zero-length randomString is useless.');
  }

  const chars = ('ABCDEFGHIJKLMNOPQRSTUVWXYZ' +
               'abcdefghijklmnopqrstuvwxyz' +
               '0123456789');
  
  let objectId = '';
  const bytes = randomBytes(size);
  for(let i = 0; i < bytes.length; ++i) {
    objectId += chars[bytes.readUInt8(i) % chars.length];
  }

  return objectId;
}

export function newObjectId(): string {
  return randomString(10);
}

export function newToken(): string {
  return randomHexString(32);
}

export function md5Hash(string: string): string {
  return createHash('md5').update(string).digest('hex');
}