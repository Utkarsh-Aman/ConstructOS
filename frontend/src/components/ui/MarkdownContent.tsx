"use client"

import React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface MarkdownContentProps {
  content: string
  className?: string
}

export function MarkdownContent({ content, className = "" }: MarkdownContentProps) {
  return (
    <div className={`prose prose-slate max-w-none text-sm leading-relaxed ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-2.5 last:mb-0">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          h1: ({ children }) => <h1 className="text-base font-bold text-slate-900 mt-3 mb-1.5">{children}</h1>,
          h2: ({ children }) => <h2 className="text-sm font-bold text-slate-900 mt-2.5 mb-1.5">{children}</h2>,
          h3: ({ children }) => <h3 className="text-xs font-bold text-slate-800 mt-2 mb-1 uppercase tracking-wider">{children}</h3>,
          ul: ({ children }) => <ul className="list-disc pl-5 mb-2.5 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 mb-2.5 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="text-slate-700">{children}</li>,
          table: ({ children }) => (
            <div className="overflow-x-auto my-3 rounded-lg border border-slate-200 shadow-xs">
              <table className="min-w-full divide-y divide-slate-200 text-xs text-left">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-slate-100 text-slate-700 font-semibold">{children}</thead>,
          tbody: ({ children }) => <tbody className="divide-y divide-slate-100 bg-white">{children}</tbody>,
          tr: ({ children }) => <tr className="hover:bg-slate-50/80 transition-colors">{children}</tr>,
          th: ({ children }) => <th className="px-3 py-2 text-xs font-semibold text-slate-800">{children}</th>,
          td: ({ children }) => <td className="px-3 py-2 text-xs text-slate-700 align-top">{children}</td>,
          code: ({ children, ...props }) => {
            const isInline = !String(children).includes("\n")
            return isInline ? (
              <code className="bg-slate-100 text-primary font-mono text-[11px] px-1.5 py-0.5 rounded border border-slate-200" {...props}>
                {children}
              </code>
            ) : (
              <pre className="bg-slate-900 text-slate-100 font-mono text-xs p-3 rounded-lg overflow-x-auto my-2">
                <code>{children}</code>
              </pre>
            )
          },
          blockquote: ({ children }) => (
            <blockquote className="border-l-3 border-primary/60 pl-3 my-2 text-slate-600 italic bg-slate-50/60 py-1 rounded-r">
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
