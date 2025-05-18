import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useState } from "react";

interface CodeBlockProps {
  className?: string;
  children: React.ReactNode;
}

export default function CodeBlock({ className, children }: CodeBlockProps) {
  const language = className?.replace("language-", "") || "";
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(String(children)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1000);
    });
  };

  return (
    <div
      className="rounded-xl border border-[var(--input-border)] bg-[#f6f6f9] my-4 overflow-hidden"
      style={{ fontSize: "0.95em" }}
    >
      <header className="flex items-center justify-between px-4 py-2 bg-[#f3f3f6] border-b border-[var(--input-border)]">
        <span className="text-xs text-gray-500 font-mono">{language || "code"}</span>
        <button
          className="text-xs text-gray-500 hover:text-gray-700"
          onClick={handleCopy}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </header>
      <SyntaxHighlighter
        language={language}
        style={oneLight}
        customStyle={{ background: "#f6f6f9", margin: 0, padding: "1em" }}
        codeTagProps={{ style: { background: "#f6f6f9" } }}
        showLineNumbers={false}
      >
        {String(children).replace(/\n$/, "")}
      </SyntaxHighlighter>
    </div>
  );
}
