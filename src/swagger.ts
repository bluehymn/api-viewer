import * as SwaggerParser from 'swagger-parser';
import * as vscode from 'vscode';

export async function importJson(url: string) {
  SwaggerParser.validate(url, (err, api) => {
    if (err) {
      vscode.window.showInformationMessage(
        'APIViewer: Import failed',
      );
    } else {
      const paths = api?.paths;
      console.log(paths);
    }
  });
}
