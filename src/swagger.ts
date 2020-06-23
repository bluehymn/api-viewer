import * as SwaggerParser from 'swagger-parser';

export function importJson(url: string) {
  let paths;
  return new Promise((resolve, reject) => {
    SwaggerParser.validate(url, (err, api) => {
      if (err) {
        reject();
        // vscode.window.showInformationMessage('APIViewer: Import failed');
      } else {
        paths = api?.paths;
        console.log(api);
        resolve(paths);
      }
    });
  });
}
