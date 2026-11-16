import type { Message } from '../core';

// Messages for the "admin" area. Keys are prefixed "admin." (see ../README.md).
export const en = {} as const;

export const cs: Record<keyof typeof en, Message> = {};
