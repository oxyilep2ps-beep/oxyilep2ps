'use client';

import { useEffect } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
};

type ToolbarButton = {
  label: string;
  onClick: () => void;
  active: boolean;
};

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
    ],
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          'min-h-[300px] w-full rounded-b-2xl border border-t-0 border-white/60 bg-white/70 px-4 py-3 text-sm text-neutral-900 outline-none dark:border-white/10 dark:bg-black/40 dark:text-neutral-100',
      },
    },
    onUpdate({ editor: activeEditor }) {
      onChange(activeEditor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value || '<p></p>', { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) return null;

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Enter URL', previousUrl ?? '');
    if (url === null) return;
    if (!url.trim()) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  };

  const buttons: ToolbarButton[] = [
    { label: 'B', onClick: () => editor.chain().focus().toggleBold().run(), active: editor.isActive('bold') },
    { label: 'I', onClick: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive('italic') },
    {
      label: 'U',
      onClick: () => editor.chain().focus().toggleUnderline().run(),
      active: editor.isActive('underline'),
    },
    {
      label: 'H1',
      onClick: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      active: editor.isActive('heading', { level: 1 }),
    },
    {
      label: 'H2',
      onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      active: editor.isActive('heading', { level: 2 }),
    },
    {
      label: 'H3',
      onClick: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      active: editor.isActive('heading', { level: 3 }),
    },
    {
      label: '• List',
      onClick: () => editor.chain().focus().toggleBulletList().run(),
      active: editor.isActive('bulletList'),
    },
    {
      label: '1. List',
      onClick: () => editor.chain().focus().toggleOrderedList().run(),
      active: editor.isActive('orderedList'),
    },
    {
      label: 'Quote',
      onClick: () => editor.chain().focus().toggleBlockquote().run(),
      active: editor.isActive('blockquote'),
    },
    { label: 'Link', onClick: setLink, active: editor.isActive('link') },
  ];

  return (
    <div>
      <div className="flex flex-wrap gap-2 rounded-t-2xl border border-white/60 bg-white/80 p-3 dark:border-white/10 dark:bg-black/50">
        {buttons.map((button) => (
          <button
            key={button.label}
            type="button"
            onClick={button.onClick}
            className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
              button.active
                ? 'bg-brand-500 text-white'
                : 'bg-black/10 text-neutral-700 hover:bg-black/20 dark:bg-white/10 dark:text-neutral-200'
            }`}
          >
            {button.label}
          </button>
        ))}
      </div>
      {placeholder && !editor.getText().trim() && (
        <p className="pointer-events-none -mb-8 mt-3 px-4 text-xs text-neutral-500">{placeholder}</p>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
