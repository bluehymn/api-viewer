import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
// import * as vscode from 'vscode';
// import * as myExtension from '../../extension';

import { syncFromSwagger } from '../../swagger-sync';
import { syncFromYapi } from '../../yapi-sync';
import * as vscode from 'vscode';
import * as path from 'path';

suite('同步', () => {
  test('swagger 同步', async () => {
    // should set the timeout of this test to 1000 ms; instead will fail
    const workspacePath = vscode.workspace.rootPath || '';
    const paths = await syncFromSwagger(
      path.join(workspacePath, 'swagger.json')
    );
    assert.equal(!!paths, true);
    assert.equal(paths.length, 3);
  });

  test('yapi 同步', async () => {
    const groups = await syncFromYapi();
    assert.equal(groups.length, 3);
  });
});


suite('', () => {});
