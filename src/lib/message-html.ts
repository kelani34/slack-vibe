import sanitizeHtml from 'sanitize-html';
import { decodeHTML } from 'entities';

const allowedTags = [
  'a', 'blockquote', 'br', 'code', 'del', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'hr', 'i', 'li', 'ol', 'p', 'pre', 's', 'span', 'strong', 'u', 'ul',
];

function messageHtmlOptions(authorizedMentionIds?: ReadonlySet<string>): sanitizeHtml.IOptions {
  return {
    allowedTags,
    allowedAttributes: {
      a: ['href', 'target', 'rel', 'title'],
      code: ['class'],
      pre: ['class'],
      span: ['class', 'data-type', 'data-id', 'data-label'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowProtocolRelative: false,
    transformTags: {
      a: (_tagName, attributes) => {
        const safeAttributes = { ...attributes };
        delete safeAttributes.target;
        delete safeAttributes.rel;

        return {
          tagName: 'a',
          attribs: {
            ...safeAttributes,
            ...(attributes.target === '_blank'
              ? { target: '_blank', rel: 'noopener noreferrer' }
              : {}),
          },
        };
      },
      span: (_tagName, attributes) => {
        const userId = attributes['data-id'];
        const isMention =
          attributes['data-type'] === 'mention' &&
          typeof userId === 'string' &&
          /^[A-Za-z0-9_-]{1,128}$/.test(userId) &&
          (authorizedMentionIds === undefined || authorizedMentionIds.has(userId));

        return {
          tagName: 'span',
          attribs: isMention
            ? {
                class: 'mention',
                'data-type': 'mention',
                'data-id': userId,
                ...(attributes['data-label'] ? { 'data-label': attributes['data-label'] } : {}),
              }
            : {},
        };
      },
    },
  };
}

export function sanitizeMessageHtml(
  value: unknown,
  authorizedMentionIds?: ReadonlySet<string>,
): string {
  return typeof value === 'string' ? sanitizeHtml(value, messageHtmlOptions(authorizedMentionIds)) : '';
}

export function messageHtmlToText(value: unknown): string {
  if (typeof value !== 'string') return '';

  const text = sanitizeMessageHtml(value)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<hr\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|li|h[1-6]|blockquote|pre)>/gi, '\n')
    .replace(/<[^>]*>/g, '');

  return decodeHTML(text)
    .replace(/[\t ]*\n[\t ]*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
