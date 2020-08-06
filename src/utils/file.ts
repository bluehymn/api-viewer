import * as fs from 'fs';

/**
 * 
 * @param filePath 
 * @param line 行号开始于0
 * @param text 
 */
export function insertTextIntoFile(filePath: string, lineNum: number, character: number, text: string) {
  const fileText = fs.readFileSync(filePath, 'utf8').toString();
  const lines = fileText.split('\n');
  const lineCount = lines.length;
  if (lineNum >= lineCount ) {
    lineNum = lineCount - 1;
  }
  let lineText = lines[lineNum];
  // 当前行去掉\r的长度（windows系统换行符），得到有效的字符串长度
  let validCharacterCount = lineText.replace('\r', '').length;
  if (character >= validCharacterCount) {
    character = validCharacterCount;
  }
  lineText = lineText.slice(0, character) + text + lineText.slice(character);
  lines[lineNum] = lineText;
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
}
