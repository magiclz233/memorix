import { describe, it, expect } from 'vitest';
import {
  appendJobError,
  appendJobLog,
  bootRecoveryDecision,
  canEnqueueScanJob,
  computeScanProgressPercent,
  isActiveScanJobStatus,
  isTerminalScanJobStatus,
  MAX_JOB_ERRORS,
  MAX_JOB_LOGS,
  shouldPersistProgress,
} from '../scan-job-state';

describe('scan job status helpers', () => {
  it('classifies active vs terminal statuses', () => {
    expect(isActiveScanJobStatus('queued')).toBe(true);
    expect(isActiveScanJobStatus('running')).toBe(true);
    expect(isActiveScanJobStatus('succeeded')).toBe(false);
    expect(isTerminalScanJobStatus('failed')).toBe(true);
    expect(isTerminalScanJobStatus('cancelled')).toBe(true);
    expect(isTerminalScanJobStatus('queued')).toBe(false);
  });

  it('blocks enqueue while an active job exists for the storage', () => {
    expect(canEnqueueScanJob([])).toBe(true);
    expect(canEnqueueScanJob(['succeeded', 'failed'])).toBe(true);
    expect(canEnqueueScanJob(['failed', 'queued'])).toBe(false);
    expect(canEnqueueScanJob(['running'])).toBe(false);
    expect(canEnqueueScanJob(['cancelled', 'succeeded', 'running'])).toBe(false);
  });

  it('decides boot recovery: running interrupted, queued kept', () => {
    expect(bootRecoveryDecision('running')).toEqual({
      action: 'interrupt',
      errorMessage: 'interrupted by server restart',
    });
    expect(bootRecoveryDecision('queued')).toEqual({ action: 'keep' });
    expect(bootRecoveryDecision('succeeded')).toEqual({ action: 'keep' });
    expect(bootRecoveryDecision('failed')).toEqual({ action: 'keep' });
    expect(bootRecoveryDecision('cancelled')).toEqual({ action: 'keep' });
  });
});

describe('ring buffers', () => {
  it('appendJobLog keeps newest entries within cap', () => {
    let logs: ReturnType<typeof appendJobLog> = [];
    for (let i = 0; i < MAX_JOB_LOGS + 50; i++) {
      logs = appendJobLog(logs, { level: 'info', message: `m${i}` }, i);
    }
    expect(logs).toHaveLength(MAX_JOB_LOGS);
    expect(logs[0].message).toBe(`m${50}`);
    expect(logs[logs.length - 1].message).toBe(`m${MAX_JOB_LOGS + 49}`);
  });

  it('appendJobLog tolerates null/undefined input', () => {
    expect(appendJobLog(null, { level: 'warn', message: 'x' }, 1)).toEqual([
      { level: 'warn', message: 'x', at: 1 },
    ]);
  });

  it('appendJobError caps at MAX_JOB_ERRORS', () => {
    let errors: ReturnType<typeof appendJobError> = [];
    for (let i = 0; i < MAX_JOB_ERRORS + 10; i++) {
      errors = appendJobError(errors, { path: `/p/${i}`, message: 'boom' }, i);
    }
    expect(errors).toHaveLength(MAX_JOB_ERRORS);
    expect(errors[0].path).toBe(`/p/${10}`);
  });
});

describe('progress persistence throttle', () => {
  it('always persists the first sample', () => {
    expect(shouldPersistProgress(null, 1000)).toBe(true);
    expect(shouldPersistProgress(undefined, 1000)).toBe(true);
  });

  it('skips samples inside the interval window', () => {
    expect(shouldPersistProgress(1000, 1500)).toBe(false);
    expect(shouldPersistProgress(1000, 1999)).toBe(false);
  });

  it('persists once the interval elapsed', () => {
    expect(shouldPersistProgress(1000, 2000)).toBe(true);
    expect(shouldPersistProgress(1000, 3000)).toBe(true);
  });
});

describe('computeScanProgressPercent', () => {
  it('returns null when total unknown or zero', () => {
    expect(computeScanProgressPercent(5, null)).toBeNull();
    expect(computeScanProgressPercent(5, 0)).toBeNull();
    expect(computeScanProgressPercent(5, undefined)).toBeNull();
  });

  it('rounds and clamps to 100', () => {
    expect(computeScanProgressPercent(1, 3)).toBe(33);
    expect(computeScanProgressPercent(3, 3)).toBe(100);
    expect(computeScanProgressPercent(7, 3)).toBe(100);
  });
});
