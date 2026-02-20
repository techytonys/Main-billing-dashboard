import { useRef, useMemo } from "react";
import ReactQuill from "react-quill-new";
import DOMPurify from "dompurify";
import "react-quill-new/dist/quill.snow.css";

interface QuillEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function QuillEditor({ value, onChange, placeholder, className }: QuillEditorProps) {
  const quillRef = useRef<ReactQuill>(null);

  const modules = useMemo(() => ({
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline", "strike"],
      [{ color: [] }, { background: [] }],
      ["blockquote", "code-block"],
      [{ list: "ordered" }, { list: "bullet" }],
      [{ indent: "-1" }, { indent: "+1" }],
      ["link"],
      ["clean"],
    ],
  }), []);

  const formats = [
    "header",
    "bold", "italic", "underline", "strike",
    "color", "background",
    "blockquote", "code-block",
    "list",
    "indent",
    "link",
  ];

  return (
    <div className={`quill-wrapper ${className || ""}`} data-testid="quill-editor">
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder || "Start typing..."}
      />
    </div>
  );
}

const SANITIZE_CONFIG = {
  ALLOWED_TAGS: ["h1", "h2", "h3", "p", "br", "strong", "em", "u", "s", "a", "ul", "ol", "li", "blockquote", "pre", "code", "span"],
  ALLOWED_ATTR: ["href", "target", "rel", "class", "style"],
};

export function RichContent({ html, className }: { html: string; className?: string }) {
  return (
    <div
      className={`rich-content ${className || ""}`}
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html, SANITIZE_CONFIG) }}
    />
  );
}
