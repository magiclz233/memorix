// 使用 fontsource 本地字体，避免在线加载 Google Fonts
import '@fontsource/open-sans/400.css';
import '@fontsource/open-sans/500.css';
import '@fontsource/open-sans/600.css';
import '@fontsource/open-sans/700.css';

import '@fontsource/noto-sans-sc/400.css';
import '@fontsource/noto-sans-sc/500.css';
import '@fontsource/noto-sans-sc/700.css';

import '@fontsource/noto-serif-sc/300.css';
import '@fontsource/noto-serif-sc/400.css';
import '@fontsource/noto-serif-sc/700.css';

import '@fontsource/lora/400.css';
import '@fontsource/lora/500.css';
import '@fontsource/lora/600.css';
import '@fontsource/lora/700.css';

// 导出字体配置供 Tailwind 使用
export const fontConfig = {
  sans: ['Open Sans', 'system-ui', 'sans-serif'],
  sansSC: ['Noto Sans SC', 'system-ui', 'sans-serif'],
  serifSC: ['Noto Serif SC', 'Georgia', 'serif'],
  serif: ['Lora', 'Georgia', 'serif'],
};
