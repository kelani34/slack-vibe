import { randomUUID } from 'node:crypto';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { cancelScheduledMessage, deleteMessage, editMessage, getMessageById, getMessageContext, getMessages, getScheduledMessages, searchMessages, sendMessage, sendScheduledMessageNow, updateScheduledMessage } from '@/actions/message';
import { forwardMessage, getBookmarkedMessages, getPinnedMessages, isMessageBookmarked, pinMessage, unpinMessage } from '@/actions/message-actions';

const actor = vi.hoisted(() => ({ id: '' }));
const notificationMock = vi.hoisted(() => ({ createNotification: vi.fn() }));
vi.mock('@/auth', () => ({ auth: vi.fn(async () => actor.id ? { user: { id: actor.id } } : null) }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/actions/notification', () => ({ createNotification: notificationMock.createNotification }));

beforeEach(async () => {
  vi.clearAllMocks();
  actor.id = randomUUID();
  await prisma.user.create({ data: { id: actor.id, email: `${actor.id}@example.test` } });
});

afterAll(() => prisma.$disconnect());

function sendWithIntent(form: FormData) {
  if (!form.has('clientMutationId')) form.set('clientMutationId', randomUUID());
  return sendMessage(form);
}

async function fixture() {
  const owner = await prisma.user.create({ data: { email: `${randomUUID()}@example.test` } });
  const workspace = await prisma.workspace.create({
    data: {
      name: 'Access fixture',
      slug: `access-${randomUUID()}`,
      ownerId: owner.id,
      members: { create: [{ userId: owner.id, role: 'OWNER' }, { userId: actor.id, role: 'MEMBER' }] },
      channels: { create: { name: 'private', type: 'PRIVATE', creatorId: owner.id, members: { create: { userId: owner.id } } } },
    },
    include: { channels: true },
  });
  const channel = workspace.channels[0];
  const message = await prisma.message.create({ data: { channelId: channel.id, userId: owner.id, content: 'private fixture' } });
  return { owner, workspace, channel, message };
}

describe('message access boundaries (F04 / A01-A03)', () => {
  it('does not return a private channel to a workspace member without channel membership', async () => {
    const { channel, message } = await fixture();
    expect(await getMessages(channel.id)).toEqual([]);
    expect(await getMessageById(message.id)).toBeNull();
  });

  it('does not return inaccessible private messages from workspace search', async () => {
    const { workspace } = await fixture();
    expect(await searchMessages('private fixture', workspace.slug)).toEqual({ items: [], nextCursor: null });
  });

  it('returns only the fields the search result list displays', async () => {
    const { owner, workspace, channel } = await fixture();
    await prisma.user.update({ where: { id: owner.id }, data: { name: 'Search Owner' } });
    await prisma.channelMember.create({ data: { channelId: channel.id, userId: actor.id } });
    const message = await prisma.message.create({
      data: { channelId: channel.id, userId: owner.id, content: 'search projection fixture' },
    });

    const results = await searchMessages('search projection fixture', workspace.slug);

    expect(results.items).toHaveLength(1);
    expect(results.items[0]).toMatchObject({
      id: message.id,
      channelId: channel.id,
      content: message.content,
      user: { name: 'Search Owner' },
      channel: { name: channel.name },
    });
    expect(results.items[0]).not.toHaveProperty('attachments');
    expect(results.items[0]).not.toHaveProperty('reactions');
    expect(results.items[0].user).not.toHaveProperty('email');
    expect(results.items[0].channel).not.toHaveProperty('workspaceId');
  });

  it('includes the parent message identity for search results inside a thread', async () => {
    const { owner, workspace, channel } = await fixture();
    await prisma.channelMember.create({ data: { channelId: channel.id, userId: actor.id } });
    const root = await prisma.message.create({
      data: { channelId: channel.id, userId: owner.id, content: 'thread search root' },
    });
    const reply = await prisma.message.create({
      data: { channelId: channel.id, userId: owner.id, parentId: root.id, content: 'thread search reply' },
    });

    const results = await searchMessages('thread search reply', workspace.slug);

    expect(results.items).toHaveLength(1);
    expect(results.items[0]).toMatchObject({ id: reply.id, parentId: root.id });
  });

  it('returns a bounded chronological context window around an older authorized message', async () => {
    const { owner, channel, message: seedMessage } = await fixture();
    await prisma.message.delete({ where: { id: seedMessage.id } });
    await prisma.channelMember.create({ data: { channelId: channel.id, userId: actor.id } });
    const messages = await Promise.all(
      Array.from({ length: 61 }, (_, index) =>
        prisma.message.create({
          data: {
            channelId: channel.id,
            userId: owner.id,
            content: `context row ${index}`,
            createdAt: new Date(Date.now() - (61 - index) * 60_000),
          },
        }),
      ),
    );

    const context = await getMessageContext(messages[30].id, channel.id);

    expect(context?.targetMessageId).toBe(messages[30].id);
    expect(context?.threadId).toBeNull();
    expect(context?.messages).toHaveLength(50);
    expect(context?.messages.map(({ id }) => id)).toEqual(messages.slice(6, 56).map(({ id }) => id));
    expect(context?.messages[24].id).toBe(messages[30].id);
    expect(context?.messages[24].user).not.toHaveProperty('email');
  });

  it('returns root context for a reply and refuses inaccessible, deleted or future targets', async () => {
    const { owner, channel, message: seedMessage } = await fixture();
    await prisma.message.delete({ where: { id: seedMessage.id } });
    const privateTarget = await prisma.message.create({
      data: { channelId: channel.id, userId: owner.id, content: 'private context target' },
    });
    expect(await getMessageContext(privateTarget.id, channel.id)).toBeNull();

    await prisma.channelMember.create({ data: { channelId: channel.id, userId: actor.id } });
    const root = await prisma.message.create({
      data: { channelId: channel.id, userId: owner.id, content: 'visible context root' },
    });
    const reply = await prisma.message.create({
      data: { channelId: channel.id, userId: owner.id, parentId: root.id, content: 'visible context reply' },
    });
    const threadContext = await getMessageContext(reply.id, channel.id);
    expect(threadContext).toMatchObject({ targetMessageId: reply.id, threadId: root.id });
    expect(threadContext?.messages.map(({ id }) => id)).toContain(root.id);
    expect(threadContext?.messages.map(({ id }) => id)).not.toContain(reply.id);

    await prisma.message.update({ where: { id: root.id }, data: { isDeleted: true } });
    expect(await getMessageContext(reply.id, channel.id)).toBeNull();
    const future = await prisma.message.create({
      data: {
        channelId: channel.id,
        userId: owner.id,
        content: 'future context target',
        scheduledAt: new Date(Date.now() + 60_000),
      },
    });
    expect(await getMessageContext(future.id, channel.id)).toBeNull();
    expect(await getMessageContext(randomUUID(), channel.id)).toBeNull();
  });

  it('surfaces temporary context query failures instead of reporting the message as unavailable', async () => {
    const { channel, message } = await fixture();
    const findFirst = vi.spyOn(prisma.message, 'findFirst')
      .mockRejectedValueOnce(new Error('temporary database failure'));

    try {
      await expect(getMessageContext(message.id, channel.id)).rejects.toThrow(
        'Unable to load message context',
      );
    } finally {
      findFirst.mockRestore();
    }
  });

  it('rejects invalid search filters instead of silently returning a broader result set', async () => {
    const { owner, workspace, channel } = await fixture();
    await prisma.channelMember.create({ data: { channelId: channel.id, userId: actor.id } });
    await prisma.message.create({
      data: { channelId: channel.id, userId: owner.id, content: 'visible search fixture' },
    });

    for (const query of ['after:not-a-date', 'has:audio', 'is:archived', 'after:""', ' '.repeat(3), 'x'.repeat(501)]) {
      await expect(searchMessages(query, workspace.slug)).resolves.toMatchObject({
        items: [],
        nextCursor: null,
        error: expect.any(String),
      });
    }
  });

  it('applies ISO date-only filters as inclusive UTC calendar days', async () => {
    const { owner, workspace, channel } = await fixture();
    await prisma.channelMember.create({ data: { channelId: channel.id, userId: actor.id } });
    const dayStart = new Date('2026-09-24T00:00:00.000Z');
    const dayEnd = new Date('2026-09-24T23:59:59.999Z');
    const priorDay = await prisma.message.create({
      data: { channelId: channel.id, userId: owner.id, content: 'calendar search fixture', createdAt: new Date('2026-09-23T23:59:59.999Z') },
    });
    const startMessage = await prisma.message.create({
      data: { channelId: channel.id, userId: owner.id, content: 'calendar search fixture', createdAt: dayStart },
    });
    const endMessage = await prisma.message.create({
      data: { channelId: channel.id, userId: owner.id, content: 'calendar search fixture', createdAt: dayEnd },
    });
    await prisma.message.create({
      data: { channelId: channel.id, userId: owner.id, content: 'calendar search fixture', createdAt: new Date('2026-09-25T00:00:00.000Z') },
    });

    const results = await searchMessages('calendar search fixture after:2026-09-24 before:2026-09-24', workspace.slug);

    expect(results.items.map(({ id }) => id)).toEqual([endMessage.id, startMessage.id]);
    expect(results.items.map(({ id }) => id)).not.toContain(priorDay.id);
    expect(results.error).toBeUndefined();
  });

  it('supports substring search through the PostgreSQL trigram index', async () => {
    const plan = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SET LOCAL enable_seqscan = off`;
      return tx.$queryRaw<Array<{ 'QUERY PLAN': unknown }>>`
        EXPLAIN (FORMAT JSON)
        SELECT id FROM "messages"
        WHERE content ILIKE '%search-index-fixture%'
      `;
    });

    expect(JSON.stringify(plan)).toContain('messages_content_trgm_idx');
  });

  it('paginates search by a stable keyset when the boundary message is deleted or an older result is edited', async () => {
    const { owner, workspace, channel } = await fixture();
    await prisma.channelMember.create({ data: { channelId: channel.id, userId: actor.id } });
    const query = 'search pagination fixture';
    const messages = await Promise.all(
      Array.from({ length: 22 }, (_, index) =>
        prisma.message.create({
          data: {
            channelId: channel.id,
            userId: owner.id,
            content: `${query} row ${index}`,
            createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, index)),
          },
        }),
      ),
    );

    const firstPage = await searchMessages(query, workspace.slug);

    expect(firstPage.items.map((message) => message.id)).toEqual(
      messages.slice(2).reverse().map((message) => message.id),
    );
    expect(firstPage.nextCursor).toEqual(expect.any(String));
    expect(await searchMessages(query, workspace.slug, 'invalid-cursor')).toEqual({
      items: [],
      nextCursor: null,
    });
    expect(await searchMessages('different pagination query', workspace.slug, firstPage.nextCursor!)).toEqual({
      items: [],
      nextCursor: null,
    });

    await prisma.message.delete({ where: { id: messages[2].id } });
    await prisma.message.update({
      where: { id: messages[0].id },
      data: { content: 'no longer a match' },
    });

    const nextPage = await searchMessages(query, workspace.slug, firstPage.nextCursor!);

    expect(nextPage.items.map((message) => message.id)).toEqual([messages[1].id]);
    expect(nextPage.nextCursor).toBeNull();
  });

  it('does not create a message without channel membership', async () => {
    const { channel } = await fixture();
    const form = new FormData();
    form.set('channelId', channel.id);
    form.set('content', 'should be rejected');
    expect(await sendWithIntent(form)).toEqual({ error: 'Not a member of this channel' });
    expect(await prisma.message.count({ where: { channelId: channel.id, content: 'should be rejected' } })).toBe(0);
  });

  it('requires a valid client mutation UUID before persisting a message', async () => {
    const { channel } = await fixture();
    await prisma.channelMember.create({ data: { channelId: channel.id, userId: actor.id } });
    const form = new FormData();
    form.set('channelId', channel.id);
    form.set('content', '<p>Every send needs a stable intent</p>');

    expect(await sendMessage(form)).toHaveProperty('error');
    form.set('clientMutationId', 'not-a-uuid');
    expect(await sendMessage(form)).toHaveProperty('error');
    expect(await prisma.message.count({ where: { channelId: channel.id, userId: actor.id } })).toBe(0);
  });

  it('sanitizes rich message HTML before saving', async () => {
    const { channel } = await fixture();
    await prisma.channelMember.create({ data: { channelId: channel.id, userId: actor.id } });
    const form = new FormData();
    form.set('channelId', channel.id);
    form.set(
      'content',
      '<p>Safe<script>steal()</script><a href="javascript:run()" onclick="run()">link</a></p>',
    );

    expect(await sendWithIntent(form)).toMatchObject({ success: true });
    const saved = await prisma.message.findFirst({
      where: { channelId: channel.id, userId: actor.id },
    });
    expect(saved?.content).toBe('<p>Safe<a>link</a></p>');
    expect(saved?.content).not.toMatch(/script|javascript:|onclick/i);
  });

  it('does not invalidate the full route tree after an ordinary optimistic send', async () => {
    const { channel } = await fixture();
    await prisma.channelMember.create({ data: { channelId: channel.id, userId: actor.id } });
    const form = new FormData();
    form.set('channelId', channel.id);
    form.set('content', '<p>already patched in the sender cache</p>');
    vi.mocked(revalidatePath).mockClear();

    expect(await sendWithIntent(form)).toMatchObject({ success: true });

    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('returns the original message for a repeated client mutation id', async () => {
    const { owner, channel } = await fixture();
    await prisma.channelMember.create({ data: { channelId: channel.id, userId: actor.id } });
    const form = new FormData();
    form.set('channelId', channel.id);
    form.set(
      'content',
      `<p><span class="mention" data-type="mention" data-id="${owner.id}">@Owner</span></p>`,
    );
    form.set('clientMutationId', randomUUID());

    const first = await sendWithIntent(form);
    const second = await sendWithIntent(form);

    if (!('message' in first) || !first.message || !('message' in second) || !second.message) {
      throw new Error('Expected both sends to return the canonical message');
    }
    expect(second.message.id).toBe(first.message.id);
    expect(await prisma.message.count({ where: { channelId: channel.id, userId: actor.id } })).toBe(1);
    expect(notificationMock.createNotification).toHaveBeenCalledTimes(1);
  });

  it('does not expose internal request hashes in message reads', async () => {
    const { channel } = await fixture();
    await prisma.channelMember.create({ data: { channelId: channel.id, userId: actor.id } });
    const form = new FormData();
    form.set('channelId', channel.id);
    form.set('content', '<p>Hash remains server-side</p>');
    form.set('clientMutationId', randomUUID());
    const sent = await sendWithIntent(form);
    if (!('message' in sent) || !sent.message) throw new Error('Expected the message to send');

    const fetched = await getMessageById(sent.message.id);

    expect(sent.message).not.toHaveProperty('requestHash');
    expect(fetched).not.toHaveProperty('requestHash');
  });

  it('rejects reusing a client mutation id for a different message', async () => {
    const { channel } = await fixture();
    await prisma.channelMember.create({ data: { channelId: channel.id, userId: actor.id } });
    const form = new FormData();
    form.set('channelId', channel.id);
    form.set('content', '<p>First payload</p>');
    form.set('clientMutationId', randomUUID());

    expect(await sendWithIntent(form)).toMatchObject({ success: true });
    form.set('content', '<p>Different payload</p>');

    expect(await sendWithIntent(form)).toEqual({ error: 'This send key was already used for another message' });
    expect(await prisma.message.count({ where: { channelId: channel.id, userId: actor.id } })).toBe(1);
  });

  it('rejects key reuse when channel, thread, schedule or attachments change', async () => {
    const { owner, channel } = await fixture();
    await prisma.channelMember.create({ data: { channelId: channel.id, userId: actor.id } });
    const otherChannel = await prisma.channel.create({
      data: {
        name: `other-${randomUUID()}`,
        workspaceId: channel.workspaceId,
        creatorId: owner.id,
        members: { create: [{ userId: owner.id }, { userId: actor.id }] },
      },
    });
    const clientMutationId = randomUUID();
    const form = new FormData();
    form.set('channelId', channel.id);
    form.set('content', '<p>Stable payload</p>');
    form.set('clientMutationId', clientMutationId);
    expect(await sendWithIntent(form)).toMatchObject({ success: true });

    const changedPayloads = [
      { channelId: otherChannel.id },
      { parentId: randomUUID() },
      { scheduledAt: new Date(Date.now() + 60_000).toISOString() },
      {
        attachments: JSON.stringify([
          { url: 'https://files.test/other.txt', name: 'other.txt', type: 'text/plain', size: 5 },
        ]),
      },
    ];
    for (const change of changedPayloads) {
      const attempt = new FormData();
      attempt.set('channelId', channel.id);
      attempt.set('content', '<p>Stable payload</p>');
      attempt.set('clientMutationId', clientMutationId);
      for (const [key, value] of Object.entries(change)) attempt.set(key, value);

      expect(await sendWithIntent(attempt)).toEqual({ error: 'This send key was already used for another message' });
    }

    expect(await prisma.message.count({ where: { userId: actor.id } })).toBe(1);
  });

  it('coalesces concurrent sends with the same client mutation id', async () => {
    const { owner, channel } = await fixture();
    await prisma.channelMember.create({ data: { channelId: channel.id, userId: actor.id } });
    const form = new FormData();
    form.set('channelId', channel.id);
    form.set(
      'content',
      `<p><span class="mention" data-type="mention" data-id="${owner.id}">@Owner</span></p>`,
    );
    form.set('clientMutationId', randomUUID());

    const [first, second] = await Promise.all([sendWithIntent(form), sendWithIntent(form)]);

    if (!('message' in first) || !first.message || !('message' in second) || !second.message) {
      throw new Error('Expected concurrent sends to return the canonical message');
    }
    expect(second.message.id).toBe(first.message.id);
    expect(await prisma.message.count({ where: { channelId: channel.id, userId: actor.id } })).toBe(1);
    expect(notificationMock.createNotification).toHaveBeenCalledTimes(1);
  });

  it('does not replay a sent message after channel access is revoked', async () => {
    const { channel } = await fixture();
    await prisma.channelMember.create({ data: { channelId: channel.id, userId: actor.id } });
    const form = new FormData();
    form.set('channelId', channel.id);
    form.set('content', '<p>Private retry</p>');
    form.set('clientMutationId', randomUUID());
    expect(await sendWithIntent(form)).toMatchObject({ success: true });

    await prisma.channelMember.delete({ where: { channelId_userId: { channelId: channel.id, userId: actor.id } } });

    expect(await sendWithIntent(form)).toEqual({ error: 'Not a member of this channel' });
    expect(await prisma.message.count({ where: { channelId: channel.id, userId: actor.id } })).toBe(1);
  });

  it('does not invalidate the full route tree when a message is scheduled', async () => {
    const { channel } = await fixture();
    await prisma.channelMember.create({ data: { channelId: channel.id, userId: actor.id } });
    const form = new FormData();
    form.set('channelId', channel.id);
    form.set('content', '<p>Send this later</p>');
    form.set('scheduledAt', new Date(Date.now() + 60_000).toISOString());
    vi.mocked(revalidatePath).mockClear();

    expect(await sendWithIntent(form)).toMatchObject({ success: true, scheduled: true });

    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('retains mention identity and notifications only for channel members', async () => {
    const { owner, workspace, channel } = await fixture();
    await prisma.channelMember.create({ data: { channelId: channel.id, userId: actor.id } });
    const outsider = await prisma.user.create({ data: { email: `${randomUUID()}@example.test` } });
    await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: outsider.id } });

    const form = new FormData();
    form.set('channelId', channel.id);
    form.set(
      'content',
      `<p><span class="mention" data-type="mention" data-id="${owner.id}">@Owner</span> <span class="mention" data-type="mention" data-id="${outsider.id}">@Outsider</span></p>`,
    );
    expect(await sendWithIntent(form)).toMatchObject({ success: true });

    const saved = await prisma.message.findFirst({
      where: { channelId: channel.id, userId: actor.id },
    });
    expect(saved?.content).toContain(`data-id="${owner.id}"`);
    expect(saved?.content).not.toContain(`data-id="${outsider.id}"`);
    expect(notificationMock.createNotification).toHaveBeenCalledTimes(1);
    expect(notificationMock.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: owner.id, type: 'MENTION' }),
    );
  });

  it('does not expose scheduled messages to a member outside the channel', async () => {
    const { channel, message } = await fixture();
    await prisma.message.update({
      where: { id: message.id },
      data: { scheduledAt: new Date(Date.now() + 60_000) },
    });
    expect(await getScheduledMessages(channel.id)).toEqual([]);
  });

  it('edits and sends the current user\'s future scheduled message', async () => {
    const { channel } = await fixture();
    await prisma.channelMember.create({ data: { channelId: channel.id, userId: actor.id } });
    const scheduledAt = new Date(Date.now() + 60_000);
    const scheduled = await prisma.message.create({
      data: { channelId: channel.id, userId: actor.id, content: 'old schedule', scheduledAt },
    });
    const editedAt = new Date(Date.now() + 120_000);
    const edited = await updateScheduledMessage(scheduled.id, 'updated schedule', editedAt);
    expect(edited).toMatchObject({ success: true, message: { content: 'updated schedule' } });
    expect((await prisma.message.findUnique({ where: { id: scheduled.id } }))?.scheduledAt?.getTime()).toBe(editedAt.getTime());
    expect(await sendScheduledMessageNow(scheduled.id)).toMatchObject({ success: true, message: { scheduledAt: null } });
  });

  it('keeps scheduled-message mutations out of full route invalidation', async () => {
    const { channel } = await fixture();
    await prisma.channelMember.create({ data: { channelId: channel.id, userId: actor.id } });
    const scheduledAt = new Date(Date.now() + 60_000);
    const messages = await Promise.all(
      ['cancel schedule', 'edit schedule', 'send schedule'].map((content) =>
        prisma.message.create({
          data: { channelId: channel.id, userId: actor.id, content, scheduledAt },
        }),
      ),
    );
    vi.mocked(revalidatePath).mockClear();

    expect(await cancelScheduledMessage(messages[0].id)).toEqual({ success: true });
    expect(await updateScheduledMessage(messages[1].id, 'edited schedule', new Date(Date.now() + 120_000))).toMatchObject({ success: true });
    expect(await sendScheduledMessageNow(messages[2].id)).toMatchObject({ success: true });

    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('sanitizes rich HTML when editing a message', async () => {
    const { channel } = await fixture();
    await prisma.channelMember.create({ data: { channelId: channel.id, userId: actor.id } });
    const message = await prisma.message.create({
      data: { channelId: channel.id, userId: actor.id, content: 'before' },
    });

    expect(await editMessage(message.id, '<p>Safe<script>steal()</script></p>')).toEqual({ success: true });
    expect((await prisma.message.findUnique({ where: { id: message.id } }))?.content).toBe('<p>Safe</p>');
  });

  it('keeps message edit and delete updates out of full route invalidation', async () => {
    const { channel } = await fixture();
    await prisma.channelMember.create({ data: { channelId: channel.id, userId: actor.id } });
    const edited = await prisma.message.create({ data: { channelId: channel.id, userId: actor.id, content: 'before edit' } });
    const deleted = await prisma.message.create({ data: { channelId: channel.id, userId: actor.id, content: 'delete me' } });
    vi.mocked(revalidatePath).mockClear();

    expect(await editMessage(edited.id, 'after edit')).toEqual({ success: true });
    expect(await deleteMessage(deleted.id)).toEqual({ success: true });

    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('keeps pin and unpin actions out of full route invalidation', async () => {
    const { owner, channel } = await fixture();
    await prisma.channelMember.create({ data: { channelId: channel.id, userId: actor.id } });
    const message = await prisma.message.create({
      data: { channelId: channel.id, userId: owner.id, content: 'pin target' },
    });
    vi.mocked(revalidatePath).mockClear();

    expect(await pinMessage(message.id, channel.id)).toEqual({ success: true });
    expect(await unpinMessage(message.id, channel.id)).toEqual({ success: true });

    expect(revalidatePath).not.toHaveBeenCalled();
    expect(await prisma.pinnedMessage.count({ where: { channelId: channel.id, messageId: message.id } })).toBe(0);
    expect((await prisma.message.findUnique({ where: { id: message.id } }))?.isPinned).toBe(false);
  });

  it('sanitizes scheduled message edits before saving', async () => {
    const { channel } = await fixture();
    await prisma.channelMember.create({ data: { channelId: channel.id, userId: actor.id } });
    const scheduled = await prisma.message.create({
      data: {
        channelId: channel.id,
        userId: actor.id,
        content: 'original',
        scheduledAt: new Date(Date.now() + 60_000),
      },
    });

    const result = await updateScheduledMessage(
      scheduled.id,
      '<p>Safe<script>steal()</script></p>',
      new Date(Date.now() + 120_000),
    );

    expect(result).toMatchObject({ success: true, message: { content: '<p>Safe</p>' } });
  });

  it('does not forward a message without membership in its source and destination', async () => {
    const { channel, message } = await fixture();
    expect(await forwardMessage(message.id, channel.id)).toEqual({ error: 'You must be a member of both channels' });
    expect(await prisma.message.count({ where: { channelId: channel.id, userId: actor.id } })).toBe(0);
  });

  it('respects destination posting permissions when forwarding', async () => {
    const { channel, message } = await fixture();
    const target = await prisma.channel.create({
      data: {
        name: `restricted-${randomUUID()}`,
        workspaceId: channel.workspaceId,
        creatorId: message.userId,
        postingPermission: 'ADMIN_ONLY',
        members: { create: [{ userId: message.userId }, { userId: actor.id }] },
      },
    });
    await prisma.channelMember.create({ data: { channelId: channel.id, userId: actor.id } });
    expect(await forwardMessage(message.id, target.id)).toEqual({ error: 'You cannot post in the destination channel' });
    expect(await prisma.message.count({ where: { channelId: target.id, userId: actor.id } })).toBe(0);
  });

  it('sanitizes legacy source HTML and escaped author attribution when forwarding', async () => {
    const { workspace, channel, message } = await fixture();
    await prisma.channelMember.create({ data: { channelId: channel.id, userId: actor.id } });
    await prisma.user.update({
      where: { id: message.userId },
      data: { name: 'Alex</em><img src=x onerror=run()><em>' },
    });
    await prisma.message.update({
      where: { id: message.id },
      data: {
        content: '<p>Safe<img src=x onerror=run()><script>steal()</script><span class="mention" data-type="mention" data-id="outsider_1">@Outsider</span></p>',
      },
    });
    const target = await prisma.channel.create({
      data: {
        name: `forward-${randomUUID()}`,
        workspaceId: workspace.id,
        creatorId: actor.id,
        members: { create: { userId: actor.id } },
      },
    });

    expect(await forwardMessage(message.id, target.id)).toEqual({ success: true });
    const forwarded = await prisma.message.findFirst({
      where: { channelId: target.id, userId: actor.id },
    });
    expect(forwarded?.content).toContain('&lt;img');
    expect(forwarded?.content).toContain('<p>Safe<span>@Outsider</span></p>');
    expect(forwarded?.content).not.toMatch(/<img|<script/i);
    expect(forwarded?.content).toContain('@Outsider');
    expect(forwarded?.content).not.toContain('data-id="outsider_1"');
  });

  it('does not expose or confirm bookmarks for messages outside the channel', async () => {
    const { channel, workspace, message } = await fixture();
    await prisma.bookmarkedMessage.create({ data: { userId: actor.id, messageId: message.id } });
    expect(await getBookmarkedMessages(channel.id, workspace.id)).toEqual([]);
    expect(await isMessageBookmarked(message.id)).toBe(false);
    expect(await prisma.bookmarkedMessage.count({ where: { userId: actor.id, messageId: message.id } })).toBe(1);
  });

  it('hides pinned and bookmarked messages after workspace removal with stale channel membership', async () => {
    const { workspace, channel, message } = await fixture();
    await prisma.channelMember.create({ data: { channelId: channel.id, userId: actor.id } });
    await prisma.bookmarkedMessage.create({ data: { userId: actor.id, messageId: message.id } });
    expect(await pinMessage(message.id, channel.id)).toEqual({ success: true });

    await prisma.workspaceMember.delete({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId: actor.id } },
    });

    expect(await getBookmarkedMessages(channel.id, workspace.id)).toEqual([]);
    expect(await getPinnedMessages(channel.id, workspace.id)).toEqual([]);
  });
});
