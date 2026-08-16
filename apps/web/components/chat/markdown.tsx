import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

/**
 * Renders assistant output as Markdown (GFM). Raw HTML is not rendered, and
 * code blocks use the same GitHub-dark surface as the landing page preview.
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="space-y-2 [&_p]:leading-relaxed [&_hr]:border-border">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              {children}
            </a>
          ),
          pre: ({ children }) => (
            <pre className="overflow-x-auto rounded-lg border border-zinc-700 bg-[#0d1117] p-3 text-xs leading-5 text-zinc-100 [&_code]:rounded-none [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-inherit [&_code]:font-mono">
              {children}
            </pre>
          ),
          code: ({ className, children, ...props }) => {
            // A fenced block without a language has no language-* class. The
            // <pre> descendant rules above reset its inline-code chip styles.
            if (className?.includes("language-")) {
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              )
            }
            return (
              <code className="rounded bg-muted px-1.5 py-0.5 text-[0.9em] font-mono" {...props}>
                {children}
              </code>
            )
          },
          h1: ({ children }) => <h1 className="text-base font-semibold tracking-tight">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base font-semibold tracking-tight">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-semibold tracking-tight">{children}</h3>,
          h4: ({ children }) => <h4 className="text-sm font-semibold tracking-tight">{children}</h4>,
          ul: ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-border pl-3 italic text-muted-foreground">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full border-collapse text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border-b border-border bg-muted/40 px-2.5 py-1.5 text-left font-medium">
              {children}
            </th>
          ),
          td: ({ children }) => <td className="border-b border-border px-2.5 py-1.5">{children}</td>,
          input: ({ type, checked, disabled }) => (
            <input type={type} checked={checked} disabled={disabled} readOnly />
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
