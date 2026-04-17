/**
 * XSS 防护工具类
 * 提供 HTML 清理、输入过滤和输出转义功能
 */
export class Sanitizer {
  /** 允许的 HTML 标签 */
  private static ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li'];
  /** 允许的 HTML 属性 */
  private static ALLOWED_ATTRS = ['href', 'target', 'rel'];

  /**
   * 清理 HTML 内容（服务端使用）
   * 移除不安全的标签和属性
   */
  static sanitizeHtml(html: string): string {
    // 简单实现：移除所有 script、iframe、style 标签
    let cleaned = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // 移除事件处理器
      .replace(/javascript:/gi, ''); // 移除 javascript: 协议

    return cleaned;
  }

  /**
   * 清理用户输入（通用文本）
   * 移除 HTML 标签，限制长度
   */
  static sanitizeInput(input: string, maxLength: number = 1000): string {
    return input
      .trim()
      .replace(/[<>]/g, '') // 移除尖括号
      .slice(0, maxLength);
  }

  /**
   * 转义 HTML 特殊字符
   * 用于输出到页面时防止 XSS
   */
  static escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;',
    };

    return text.replace(/[&<>"'/]/g, (char) => map[char]);
  }

  /**
   * 反转义 HTML 实体
   */
  static unescapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#x27;': "'",
      '&#x2F;': '/',
    };

    return text.replace(/&(?:amp|lt|gt|quot|#x27|#x2F);/g, (entity) => map[entity]);
  }
}
