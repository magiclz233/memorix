import { db } from './drizzle';
import { performanceMetrics, errorLogs } from './schema';
import { gte, eq, and, sql } from 'drizzle-orm';
import { createLogger } from './logger';
import type { AlertRule, AlertEvent } from './definitions';

const logger = createLogger('alerting');

/**
 * 预定义告警规则
 */
export const alertRules: AlertRule[] = [
  {
    id: 'high-lcp',
    name: 'LCP 过高',
    metric: 'LCP',
    threshold: 2500,
    operator: '>',
    duration: 300, // 5 分钟内的平均值
    channels: ['slack'],
  },
  {
    id: 'high-cls',
    name: 'CLS 过高',
    metric: 'CLS',
    threshold: 0.1,
    operator: '>',
    duration: 300,
    channels: ['slack'],
  },
  {
    id: 'slow-api',
    name: 'API 响应过慢',
    metric: 'TTFB',
    threshold: 3000,
    operator: '>',
    duration: 180,
    channels: ['slack'],
  },
];

/**
 * 告警管理器
 */
export class AlertManager {
  /**
   * 检查所有告警规则
   */
  static async checkRules(): Promise<void> {
    for (const rule of alertRules) {
      try {
        const shouldAlert = await this.evaluateRule(rule);
        if (shouldAlert) {
          await this.triggerAlert(rule);
        }
      } catch (error) {
        logger.error({ rule: rule.id, error }, '告警规则检查失败');
      }
    }
  }

  /**
   * 评估单条告警规则
   */
  private static async evaluateRule(rule: AlertRule): Promise<boolean> {
    const since = new Date(Date.now() - rule.duration * 1000);

    const result = await db
      .select({
        avg: sql<number>`AVG(${performanceMetrics.metricValue})`,
        count: sql<number>`COUNT(*)`,
      })
      .from(performanceMetrics)
      .where(
        and(
          eq(performanceMetrics.metricName, rule.metric),
          gte(performanceMetrics.createdAt, since),
        ),
      );

    const avg = result[0]?.avg;
    const count = result[0]?.count ?? 0;

    // 样本数不足时不触发告警
    if (!avg || count < 5) return false;

    switch (rule.operator) {
      case '>': return avg > rule.threshold;
      case '<': return avg < rule.threshold;
      case '>=': return avg >= rule.threshold;
      case '<=': return avg <= rule.threshold;
      case '==': return avg === rule.threshold;
      default: return false;
    }
  }

  /**
   * 触发告警通知
   */
  private static async triggerAlert(rule: AlertRule): Promise<void> {
    const event: AlertEvent = {
      ruleId: rule.id,
      metric: rule.metric,
      value: 0,
      threshold: rule.threshold,
      timestamp: new Date(),
      resolved: false,
    };

    logger.warn({ rule: rule.id, event }, `告警触发: ${rule.name}`);

    for (const channel of rule.channels) {
      try {
        switch (channel) {
          case 'slack':
            await this.sendSlackAlert(rule, event);
            break;
          case 'email':
            await this.sendEmailAlert(rule, event);
            break;
          case 'webhook':
            await this.sendWebhookAlert(rule, event);
            break;
        }
      } catch (error) {
        logger.error({ channel, rule: rule.id, error }, '告警发送失败');
      }
    }
  }

  /**
   * 发送 Slack 告警
   */
  private static async sendSlackAlert(rule: AlertRule, event: AlertEvent): Promise<void> {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) return;

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `🚨 *告警: ${rule.name}*`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${rule.name}*\n指标: ${rule.metric}\n阈值: ${rule.operator} ${rule.threshold}\n时间: ${event.timestamp.toISOString()}`,
            },
          },
        ],
      }),
    });
  }

  /**
   * 发送邮件告警（占位实现）
   */
  private static async sendEmailAlert(rule: AlertRule, _event: AlertEvent): Promise<void> {
    logger.info({ rule: rule.id }, '邮件告警（未配置邮件服务）');
  }

  /**
   * 发送 Webhook 告警
   */
  private static async sendWebhookAlert(rule: AlertRule, event: AlertEvent): Promise<void> {
    const webhookUrl = process.env.ALERT_WEBHOOK_URL;
    if (!webhookUrl) return;

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rule, event }),
    });
  }

  /**
   * 获取最近的错误率
   */
  static async getErrorRate(windowMinutes: number = 5): Promise<number> {
    const since = new Date(Date.now() - windowMinutes * 60 * 1000);

    const result = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(errorLogs)
      .where(
        and(
          eq(errorLogs.level, 'error'),
          gte(errorLogs.createdAt, since),
        ),
      );

    return result[0]?.count ?? 0;
  }
}

// 注意：Vercel Serverless 环境不支持持久 setInterval
// 告警检查应通过 Vercel Cron Jobs 触发 /api/cron/check-alerts 端点
// 参考：https://vercel.com/docs/cron-jobs
