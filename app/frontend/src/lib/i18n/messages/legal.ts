import type { Message } from '../core';

// Messages for the "legal" area. Keys are prefixed "legal." (see ../README.md).
export const en = {} as const;

export const cs: Record<keyof typeof en, Message> = {};
