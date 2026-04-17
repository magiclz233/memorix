/**
 * 翻译文件自动排序工具
 * 对翻译文件的 key 进行字母排序，保持文件整洁
 *
 * 使用方式：npx tsx scripts/sort-i18n.ts
 */

import fs from 'fs';
import path from 'path';

const MESSAGES_DIR = path.join(process.cwd(), 'messages');

/**
 * 递归对对象的 key 进行排序
 */
function sortObjectKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }

  if (obj !== null && typeof obj === 'object') {
    const sorted: Record<string, unknown> = {};
    const keys = Object.keys(obj as Record<string, unknown>).sort();

    for (const key of keys) {
      sorted[key] = sortObjectKeys((obj as Record<string, unknown>)[key]);
    }

    return sorted;
  }

  return obj;
}

function sortFile(filePath: string): void {
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  文件不存在: ${filePath}`);
    return;
  }

  const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const sorted = sortObjectKeys(content);
  fs.writeFileSync(filePath, JSON.stringify(sorted, null, 2) + '\n', 'utf-8');
  console.log(`✅ 已排序: ${path.basename(filePath)}`);
}

function main() {
  const files = fs.readdirSync(MESSAGES_DIR).filter((f) => f.endsWith('.json'));

  if (files.length === 0) {
    console.log('没有找到翻译文件');
    return;
  }

  console.log(`\n📝 对 ${files.length} 个翻译文件进行排序...\n`);

  for (const file of files) {
    sortFile(path.join(MESSAGES_DIR, file));
  }

  console.log('\n完成！');
}

main();
