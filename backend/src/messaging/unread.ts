export function unreadCount(
  messages: Array<{ senderId: string; createdAt: Date }>,
  readerId: string,
  lastOpenedAt: Date | null,
): number {
  const since = lastOpenedAt?.getTime() ?? Number.NEGATIVE_INFINITY;
  return messages.filter((message) => message.senderId !== readerId && message.createdAt.getTime() > since).length;
}
