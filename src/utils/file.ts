import * as fs from 'fs';

export function insertCodeAfterLine(filePath: string, line: number, code: string) {
  const text = fs.readFileSync(filePath, 'utf8').toString();
  const lines = text.split('\n');
  lines.splice(line, 0, code);
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
}
