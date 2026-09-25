import { ReactRenderer } from '@tiptap/react';
import type { SuggestionKeyDownProps, SuggestionProps } from '@tiptap/suggestion';
import tippy, { type Instance } from 'tippy.js';
import { MentionList, type MentionListItem, type MentionListProps, type MentionListRef } from './mention-list';

type MentionSelection = { id: string; label: string };
type MentionSuggestionProps = SuggestionProps<MentionListItem, MentionSelection>;

export const createSuggestion = (onOpenChange?: (isOpen: boolean) => void) => ({
  render: () => {
    let component: ReactRenderer<MentionListRef, MentionListProps> | undefined;
    let popup: Instance[] = [];

    return {
      onStart: (props: MentionSuggestionProps) => {
        onOpenChange?.(true);

        component = new ReactRenderer<MentionListRef, MentionListProps>(MentionList, {
          props,
          editor: props.editor,
        });

        if (!props.clientRect) {
          return;
        }
        const referenceRect = props.clientRect();
        if (!referenceRect) return;

        popup = tippy('body', {
          getReferenceClientRect: () => referenceRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
        });
      },

      onUpdate(props: MentionSuggestionProps) {
        if (!component) return;
        component.updateProps({ items: props.items, command: props.command });

        const referenceRect = props.clientRect?.();
        if (!referenceRect) return;

        popup[0]?.setProps({
          getReferenceClientRect: () => referenceRect,
        });
      },

      onKeyDown(props: SuggestionKeyDownProps) {
        if (props.event.key === 'Escape') {
          popup[0]?.hide();
          return true;
        }

        return component?.ref?.onKeyDown(props) ?? false;
      },

      onExit() {
        onOpenChange?.(false);
        popup[0]?.destroy();
        popup = [];
        component?.destroy();
        component = undefined;
      },
    };
  },
});
