import type { Message } from '../core';
import { en } from './en';
import { cs as csMessages } from './cs';

export { en };

export type MessageKey = keyof typeof en;

export const cs = csMessages as Record<MessageKey, Message>;
