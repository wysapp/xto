

import { randomBytes, createHash } from 'crypto';



export function randomHexString(size: number) : string {
  if (size === 0) {
    throw new Error('Zero-length randomHexString is useless.');
  }

  if ( size % 2 !== 0) {
    throw new Error('randomHexString size must be divisible by 2.')
  }

  return randomBytes(size/2).toString('hex');
}


export function randomString(size: number): string {
  if ( size === 0) {
    throw new Error('Zero-length randomString is useless.');
  }

  let chars = ('ABCDEFGHIJKLMNOPQRSTUVWXYZ' +
               'abcdefghijklmnopqrstuvwxyz' +
               '0123456789');
  
  let objectId = '';
  let bytes = randomBytes(size);
  for(let i = 0; i < bytes.length; ++i) {
    objectId += chars[ bytes.readInt8(i) % chars.length ];
  }

  return objectId;
}

export function newObjectId(): string {
  return randomString(10);
}

export function newToken(): string {
  return randomString(32);
}

export function md5Hash(string: string): string {
  return createHash('md5').update(string).digest('hex');
}

