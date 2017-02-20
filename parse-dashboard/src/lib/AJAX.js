/*
 * Copyright (c) 2016-present, Parse, LLC
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

let basePath = '';

export function setBasePath(newBasePath) {
  basePath = newBasePath || '';
  if (basePath.endsWith('/') ) {
    basePath = basePath.slice(0, basePath.length - 1);
  }
}