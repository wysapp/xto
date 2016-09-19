'use strict';

import fs from 'fs';
import path from 'path';
import { Schema } from './schema';
import { graphql } from 'graphql';
import { introspectionQuery, printSchema } from 'graphql/utilities';

(async () => {
  var result = await (graphql(Schema, introspectionQuery));
  if(result.errors) {
    console.error(
      'ERROR introspecting schema: ',
      JSON.stringify(result.errors, null, 2)
    );
  } else {
    
    fs.writeFileSync(
      path.join(__dirname, './schema.json'),
      JSON.stringify(result, null, 2)
    );
  }
})();

fs.writeFileSync(
  path.join(__dirname, './schema.graphql'),
  printSchema(Schema)
);

console.log('Done. Restart React Native packager using: \n');
console.log('  react-native start --reset-cache\n');