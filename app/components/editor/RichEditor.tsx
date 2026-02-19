"use client";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useCallback } from "react";
import { marked } from "marked";

interface RichEditorProps {
  content: string;
  onChange?: (markdown: string) => void;
  readonly?: boolean;
  placeholder?: string;
}

// HTML → markdown (for saving edits back)
function toMarkdown(html: string): string {
  return html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n")
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n")
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n")
    .replace(/<strong>(.*?)<\/strong>/gi, "**$1**")
    .replace(/<em>(.*?)<\/em>/gi, "_$1_")
    .replace(/<code>(.*?)<\/code>/gi, "`$1`")
    .replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

// Markdown → HTML using `marked` (handles tables, nested lists, code blocks etc.)
function fromMarkdown(md: string): string {
  if (!md) return "";
  try {
    return marked.parse(md, { async: false }) as string;
  } catch {
    return `<p>${md}</p>`;
  }
}

export function RichEditor({ content, onChange, readonly, placeholder }: RichEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: placeholder ?? "Start writing…" }),
    ],
    content: fromMarkdown(content),
    editable: !readonly,
    onUpdate: ({ editor }) => {
      onChange?.(toMarkdown(editor.getHTML()));
    },
    immediatelyRender: false,
  });

  const stableOnChange = useCallback((md: string) => onChange?.(md), [onChange]);

  useEffect(() => {
    if (!editor) return;
    const current = toMarkdown(editor.getHTML());
    if (current !== content) {
      editor.commands.setContent(fromMarkdown(content));
    }
  }, [content]);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {!readonly && (
        <div style={{
          display: "flex", gap: "4px", padding: "8px 12px",
          borderBottom: "1px solid var(--border-subtle)", flexShrink: 0, flexWrap: "wrap",
        }}>
          {[
            { label: "B", title: "Bold", action: () => editor?.chain().focus().toggleBold().run(), active: editor?.isActive("bold") },
            { label: "I", title: "Italic", action: () => editor?.chain().focus().toggleItalic().run(), active: editor?.isActive("italic") },
            { label: "H1", title: "Heading 1", action: () => editor?.chain().focus().toggleHeading({ level: 1 }).run(), active: editor?.isActive("heading", { level: 1 }) },
            { label: "H2", title: "Heading 2", action: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(), active: editor?.isActive("heading", { level: 2 }) },
            { label: "H3", title: "Heading 3", action: () => editor?.chain().focus().toggleHeading({ level: 3 }).run(), active: editor?.isActive("heading", { level: 3 }) },
            { label: "•", title: "Bullet list", action: () => editor?.chain().focus().toggleBulletList().run(), active: editor?.isActive("bulletList") },
            { label: "1.", title: "Ordered list", action: () => editor?.chain().focus().toggleOrderedList().run(), active: editor?.isActive("orderedList") },
            { label: "</>", title: "Code block", action: () => editor?.chain().focus().toggleCodeBlock().run(), active: editor?.isActive("codeBlock") },
          ].map((btn) => (
            <button key={btn.label} title={btn.title} onMouseDown={(e) => { e.preventDefault(); btn.action(); }}
              style={{
                background: btn.active ? "var(--bg-card-elevated)" : "none",
                border: "1px solid " + (btn.active ? "var(--border-default)" : "transparent"),
                borderRadius: "5px", padding: "3px 8px",
                color: btn.active ? "var(--text-primary)" : "var(--text-secondary)",
                fontSize: "12px", fontWeight: 600, cursor: "pointer",
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>
      )}
      <div style={{ flex: 1, overflow: "auto", padding: "16px 20px" }}>
        <EditorContent
          editor={editor}
          style={{ height: "100%", outline: "none" }}
        />
      </div>
    </div>
  );
}
