type Messages = Record<string, unknown>;

const getMessageString = (messages: Messages, key: string) => {
  let current: unknown = messages;
  for (const part of key.split('.')) {
    if (!current || typeof current !== 'object' || !(part in current)) {
      return null;
    }
    current = (current as Messages)[part];
  }
  return typeof current === 'string' ? current : null;
};

export const resolveMessage = (messages: Messages, key?: string | null) => {
  if (!key) return '';
  const value = getMessageString(messages, key);
  return value ?? key;
};
