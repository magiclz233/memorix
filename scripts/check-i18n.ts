/**
 * 翻译缺失检测工具
 * 对比 zh-CN.json 和 en.json 的 key 结构，输出缺失的翻译 key
 *
 * 使用方式：npx tsx scripts/check-i18n.ts
 */

import fs from 'fs';
import path from 'path';

const MESSAGES_DIR = path.join(process.cwd(), 'messages');
const ZH_FILE = path.join(MESSAGES_DIR, 'zh-CN.json');
const EN_FILE = path.join(MESSAGES_DIR, 'en.json');

/**
 * 递归获取对象的所有 key 路径
 */
function getAllKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...getAllKeys(value as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }

  return keys;
}

/**
 * 在对象中设置嵌套 key 的值
 */
function setNestedValue(
  obj: Record<string, unknown>,
  keyPath: string,
  value: unknown,
): void {
  const parts = keyPath.split('.');
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current) || typeof current[part] !== 'object') {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  current[parts[parts.length - 1]] = value;
}

function main() {
  // 读取翻译文件
  if (!fs.existsSync(ZH_FILE)) {
    console.error(`❌ 找不到文件: ${ZH_FILE}`);
    process.exit(1);
  }
  if (!fs.existsSync(EN_FILE)) {
    console.error(`❌ 找不到文件: ${EN_FILE}`);
    process.exit(1);
  }

  const zhMessages = JSON.parse(fs.readFileSync(ZH_FILE, 'utf-8'));
  const enMessages = JSON.parse(fs.readFileSync(EN_FILE, 'utf-8'));

  const zhKeys = new Set(getAllKeys(zhMessages));
  const enKeys = new Set(getAllKeys(enMessages));

  // 找出 en.json 中缺失的 key（zh-CN.json 有但 en.json 没有）
  const missingInEn = [...zhKeys].filter((key) => !enKeys.has(key));
  // 找出 zh-CN.json 中缺失的 key（en.json 有但 zh-CN.json 没有）
  const missingInZh = [...enKeys].filter((key) => !zhKeys.has(key));

  console.log('\n📊 翻译文件检查报告');
  console.log('='.repeat(50));
  console.log(`zh-CN.json: ${zhKeys.size} 个 key`);
  console.log(`en.json: ${enKeys.size} 个 key`);

  if (missingInEn.length === 0 && missingInZh.length === 0) {
    console.log('\n✅ 所有翻译 key 完整，无缺失！');
    return;
  }

  if (missingInEn.length > 0) {
    console.log(`\n❌ en.json 缺失 ${missingInEn.length} 个 key:`);
    missingInEn.forEach((key) => console.log(`  - ${key}`));

    // 自动添加占位符
    const updatedEn = { ...enMessages };
    missingInEn.forEach((key) => {
      setNestedValue(updatedEn, key, `[TODO: ${key}]`);
    });

    fs.writeFileSync(EN_FILE, JSON.stringify(updatedEn, null, 2) + '\n', 'utf-8');
    console.log(`\n✏️  已在 en.json 中添加 ${missingInEn.length} 个占位符`);
  }

  if (missingInZh.length > 0) {
    console.log(`\n⚠️  zh-CN.json 缺失 ${missingInZh.length} 个 key:`);
    missingInZh.forEach((key) => console.log(`  - ${key}`));
  }

  console.log('\n完成！请补充缺失的翻译内容。');
}

main();
