import * as SwaggerParser from 'swagger-parser';
import { APIGroup } from './types';
import { adapter } from './adapter';

export function syncFromSwagger(url: string) {
  let groups: APIGroup[] = [];
  return new Promise<APIGroup[]>((resolve, reject) => {
    SwaggerParser.validate(url, (err, data) => {
      if (err) {
        reject(new Error('APIViewer: Import failed'));
      } else {
        groups = adapter(data, 'swagger');
        resolve(groups);
      }
    });
  });
}
