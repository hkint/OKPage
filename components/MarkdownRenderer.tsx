// okpage/components/MarkdownRenderer.tsx
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';

// CSS for KaTeX and Highlight.js will be imported in global.css

interface MarkdownRendererProps {
  markdown: string;
  className?: string; // Optional className for the wrapper div
}

const MarkdownDisplay: React.FC<MarkdownRendererProps> = ({ markdown, className }) => {
  return (
    // The subtask mentions Tailwind Typography's 'prose' classes.
    // Since @tailwindcss/typography is not installed yet, we'll use a generic div.
    // When Typography is added, className could be: `prose dark:prose-invert max-w-none ${className || ''}`
    <div className={`markdown-content ${className || ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        components={{
          // Optional: Custom renderers can be added here if needed later.
          // Example: For opening links in new tabs:
          // a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" />,

          // rehype-highlight will add its own classes to <pre><code> blocks.
          // We might need to ensure our Tailwind CSS doesn't strip them, or style them appropriately.
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownDisplay;
