import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
// import * as vscode from 'vscode';
// import * as myExtension from '../../extension';

import { syncFromSwagger } from '../../swagger-sync';

suite('my suite', () => {
  test('my test', async () => {
    // should set the timeout of this test to 1000 ms; instead will fail
    const paths = await syncFromSwagger(
      'https://petstore.swagger.io/v2/swagger.json',
    );
    assert.equal(paths, true);
  });
});
