"use client";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useCallback } from "react";

interface RichEditorProps {
  content: string;
  onChange?: (markdown: string) => void;
  readonly?: boolean;
  placeholder?: string;
}

// Simple markdown serializer
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

// Simple markdown to HTML parser for display
function fromMarkdown(md: string): string {
  if (!md) return "";
  return md
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/_(.+?)_/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>[\s\S]*?<\/li>)/g, "<ul>$1</ul>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/^(?!<[hul])(.+)$/gm, "<p>$1</p>");
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

  useEffect(() => {
    if (editor && content !== undefined) {
      const current = toMarkdown(editor.getHTML());
      if (current !== content) {
        editor.commands.setContent(fromMarkdown(content));
      }
    }
  }, [content]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {!readonly && editor && (
        <div style={{
          display: "flex", gap: "4px", padding: "8px 12px",
          borderBottom: "1px solid var(--border-subtle)",
          flexShrink: 0,
        }}>
          {[
            { label: "B", cmd: () => editor.chain().focus().toggleBold().run(), active: editor.isActive("bold") },
            { label: "I", cmd: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive("italic") },
            { label: "H1", cmd: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), active: editor.isActive("heading", { level: 1 }) },
            { label: "H2", cmd: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive("heading", { level: 2 }) },
            { label: "H3", cmd: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: editor.isActive("heading", { level: 3 }) },
            { label: "• List", cmd: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive("bulletList") },
            { label: "<>", cmd: () => editor.chain().focus().toggleCode().run(), active: editor.isActive("code") },
          ].map((btn) => (
            <button
              key={btn.label}
              onMouseDown={(e) => { e.preventDefault(); btn.cmd(); }}
              style={{
                background: btn.active ? "var(--bg-card-elevated)" : "none",
                border: "1px solid " + (btn.active ? "var(--border-default)" : "transparent"),
                borderRadius: "4px",
                padding: "3px 8px",
                fontSize: "12px",
                fontWeight: btn.label === "B" ? 700 : 400,
                fontStyle: btn.label === "I" ? "italic" : "normal",
                color: btn.active ? "var(--text-primary)" : "var(--text-muted)",
                cursor: "pointer",
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>
      )}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
        <style>{`
          .tiptap { outline: none; color: var(--text-primary); font-size: 14px; line-height: 1.7; }
          .tiptap h1 { font-size: 22px; font-weight: 700; margin: 0 0 12px; color: var(--text-primary); }
          .tiptap h2 { font-size: 17px; font-weight: 600; margin: 20px 0 8px; color: var(--text-primary); }
          .tiptap h3 { font-size: 14px; font-weight: 600; margin: 16px 0 6px; color: var(--text-secondary); }
          .tiptap p { margin: 0 0 10px; }
          .tiptap ul { padding-left: 20px; margin: 0 0 10px; }
          .tiptap li { margin-bottom: 4px; }
          .tiptap code { background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 4px; padding: 2px 6px; font-size: 12px; font-family: monospace; }
          .tiptap strong { font-weight: 600; }
          .tiptap .is-editor-empty:first-child::before { content: attr(data-placeholder); color: var(--text-muted); float: left; pointer-events: none; height: 0; }
        `}</style>
        <EditorContent editor={editor} className="tiptap" />
      </div>
    </div>
  );
}
