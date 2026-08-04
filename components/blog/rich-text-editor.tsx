'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Image from '@tiptap/extension-image';
import { ImagePlus, Loader2 } from 'lucide-react';

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Optional inline image uploader — returns a public URL. */
  onUploadInlineImage?: (file: File) => Promise<string>;
  onInlineImagesChange?: (urls: string[]) => void;
};

type ToolbarButton = {
  label: string;
  onClick: () => void;
  active: boolean;
};

type SlashItem = {
  id: string;
  label: string;
  description: string;
  run: () => void;
};

function extractImageUrls(html: string): string[] {
  const urls: string[] = [];
  const re = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) urls.push(match[1]);
  return [...new Set(urls)];
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  onUploadInlineImage,
  onInlineImagesChange,
}: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [uploading, setUploading] = useState(false);

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
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: {
          class: 'my-4 max-h-[420px] w-full rounded-xl object-cover',
        },
      }),
    ],
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          'min-h-[420px] w-full rounded-b-2xl border border-t-0 border-neutral-800 bg-neutral-950/40 px-5 py-6 text-base leading-8 text-neutral-100 outline-none dark:border-neutral-800 dark:bg-neutral-950/40 dark:text-neutral-100 prose prose-invert prose-lg max-w-none',
      },
      handleKeyDown: (_view, event) => {
        if (event.key === '/' && !event.metaKey && !event.ctrlKey) {
          // Open slash menu on next tick after character inserts
          window.setTimeout(() => {
            setSlashOpen(true);
            setSlashQuery('');
          }, 0);
        }
        if (event.key === 'Escape') {
          setSlashOpen(false);
        }
        return false;
      },
    },
    onUpdate({ editor: activeEditor }) {
      const html = activeEditor.getHTML();
      onChange(html);
      onInlineImagesChange?.(extractImageUrls(html));

      const { from } = activeEditor.state.selection;
      const textBefore = activeEditor.state.doc.textBetween(Math.max(0, from - 24), from, '\n');
      const slashMatch = textBefore.match(/\/([a-zA-Z]*)$/);
      if (slashMatch) {
        setSlashOpen(true);
        setSlashQuery(slashMatch[1].toLowerCase());
      } else if (!textBefore.endsWith('/')) {
        setSlashOpen(false);
      }
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value || '<p></p>', { emitUpdate: false });
    }
  }, [editor, value]);

  const clearSlashToken = useCallback(() => {
    if (!editor) return;
    const { from } = editor.state.selection;
    const textBefore = editor.state.doc.textBetween(Math.max(0, from - 24), from, '\n');
    const slashMatch = textBefore.match(/\/[a-zA-Z]*$/);
    if (slashMatch) {
      editor
        .chain()
        .focus()
        .deleteRange({ from: from - slashMatch[0].length, to: from })
        .run();
    }
  }, [editor]);

  const insertInlineImage = useCallback(
    async (file: File) => {
      if (!editor || !onUploadInlineImage) return;
      setUploading(true);
      try {
        const url = await onUploadInlineImage(file);
        clearSlashToken();
        editor.chain().focus().setImage({ src: url, alt: file.name.replace(/\.[^.]+$/, '') }).run();
        setSlashOpen(false);
      } catch (err) {
        window.alert(err instanceof Error ? err.message : 'Image upload failed');
      } finally {
        setUploading(false);
      }
    },
    [clearSlashToken, editor, onUploadInlineImage]
  );

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

  const slashItems: SlashItem[] = [
    {
      id: 'h2',
      label: 'Heading 2',
      description: 'Section title',
      run: () => {
        clearSlashToken();
        editor.chain().focus().toggleHeading({ level: 2 }).run();
        setSlashOpen(false);
      },
    },
    {
      id: 'h3',
      label: 'Heading 3',
      description: 'Subsection',
      run: () => {
        clearSlashToken();
        editor.chain().focus().toggleHeading({ level: 3 }).run();
        setSlashOpen(false);
      },
    },
    {
      id: 'bullet',
      label: 'Bullet list',
      description: 'Unordered list',
      run: () => {
        clearSlashToken();
        editor.chain().focus().toggleBulletList().run();
        setSlashOpen(false);
      },
    },
    {
      id: 'number',
      label: 'Numbered list',
      description: 'Ordered list',
      run: () => {
        clearSlashToken();
        editor.chain().focus().toggleOrderedList().run();
        setSlashOpen(false);
      },
    },
    {
      id: 'quote',
      label: 'Quote',
      description: 'Blockquote callout',
      run: () => {
        clearSlashToken();
        editor.chain().focus().toggleBlockquote().run();
        setSlashOpen(false);
      },
    },
    {
      id: 'image',
      label: 'Image',
      description: 'Upload inline image',
      run: () => {
        if (!onUploadInlineImage) {
          window.alert('Inline image upload is not available here.');
          return;
        }
        fileInputRef.current?.click();
      },
    },
  ].filter((item) => !slashQuery || item.id.includes(slashQuery) || item.label.toLowerCase().includes(slashQuery));

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
    <div className="relative">
      <div className="flex flex-wrap items-center gap-2 rounded-t-2xl border border-white/60 bg-white/80 p-3 dark:border-white/10 dark:bg-black/50">
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
        {onUploadInlineImage ? (
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1 rounded-lg bg-brand-500/15 px-3 py-1 text-xs font-bold text-brand-600 disabled:opacity-50"
          >
            {uploading ? <Loader2 size={12} className="animate-spin" /> : <ImagePlus size={12} />}
            Inline image
          </button>
        ) : null}
        <span className="ml-auto hidden text-[10px] font-semibold uppercase tracking-wider text-neutral-400 sm:inline">
          Type / for slash commands
        </span>
      </div>
      {placeholder && !editor.getText().trim() && (
        <p className="pointer-events-none -mb-8 mt-3 px-4 text-xs text-neutral-500">{placeholder}</p>
      )}
      <EditorContent editor={editor} />

      {slashOpen && slashItems.length > 0 ? (
        <div className="absolute left-4 top-24 z-20 w-64 overflow-hidden rounded-2xl border border-white/20 bg-neutral-950/95 shadow-2xl backdrop-blur">
          <p className="border-b border-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-brand-400">
            Slash commands
          </p>
          <ul className="max-h-64 overflow-y-auto p-1">
            {slashItems.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={item.run}
                  className="flex w-full flex-col rounded-xl px-3 py-2 text-left hover:bg-brand-500/20"
                >
                  <span className="text-sm font-semibold text-white">{item.label}</span>
                  <span className="text-[11px] text-neutral-400">{item.description}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) void insertInlineImage(file);
        }}
      />
    </div>
  );
}
