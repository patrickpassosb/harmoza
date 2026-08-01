import React from 'react'
import { cn } from '@/lib/utils'

export interface MarkdownContentProps {
  content: string
  className?: string
}

export function renderInlineContent(text: string): React.ReactNode[] {
  if (!text) return []
  const regex = /(\*\*.+?\*\*|`[^`]+`|\*[^*]+\*)/g
  const parts = text.split(regex)
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      const inner = part.slice(2, -2)
      return (
        <strong key={index} className="font-bold text-foreground">
          {renderInlineContent(inner)}
        </strong>
      )
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      const inner = part.slice(1, -1)
      return (
        <code
          key={index}
          className="rounded bg-muted/80 px-1.5 py-0.5 font-mono text-[11px] text-primary"
        >
          {inner}
        </code>
      )
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      const inner = part.slice(1, -1)
      return (
        <em key={index} className="italic">
          {inner}
        </em>
      )
    }
    return <span key={index}>{part}</span>
  })
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  if (!content) return null

  try {
    const lines = content.split('\n')
    const blocks: React.ReactNode[] = []
    let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null

    const flushList = () => {
      if (!currentList) return
      const { type, items } = currentList
      const listKey = `list-${blocks.length}`
      if (type === 'ul') {
        blocks.push(
          <ul
            key={listKey}
            className="my-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-foreground"
          >
            {items.map((item, idx) => (
              <li key={idx} className="pl-0.5">
                {renderInlineContent(item)}
              </li>
            ))}
          </ul>,
        )
      } else {
        blocks.push(
          <ol
            key={listKey}
            className="my-2 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-foreground"
          >
            {items.map((item, idx) => (
              <li key={idx} className="pl-0.5">
                {renderInlineContent(item)}
              </li>
            ))}
          </ol>,
        )
      }
      currentList = null
    }

    lines.forEach((rawLine, idx) => {
      const line = rawLine.trim()

      const bulletMatch = line.match(/^[-*•]\s+(.*)$/)
      if (bulletMatch) {
        if (!currentList || currentList.type !== 'ul') {
          flushList()
          currentList = { type: 'ul', items: [] }
        }
        currentList.items.push(bulletMatch[1])
        return
      }

      const numMatch = line.match(/^\d+\.\s+(.*)$/)
      if (numMatch) {
        if (!currentList || currentList.type !== 'ol') {
          flushList()
          currentList = { type: 'ol', items: [] }
        }
        currentList.items.push(numMatch[1])
        return
      }

      flushList()

      if (!line) {
        return
      }

      if (line.startsWith('### ')) {
        blocks.push(
          <h3
            key={`h3-${idx}`}
            className="mt-3 mb-1 text-xs font-bold uppercase tracking-wider text-foreground"
          >
            {renderInlineContent(line.slice(4))}
          </h3>,
        )
        return
      }
      if (line.startsWith('## ')) {
        blocks.push(
          <h2 key={`h2-${idx}`} className="mt-3 mb-1 text-sm font-bold text-foreground">
            {renderInlineContent(line.slice(3))}
          </h2>,
        )
        return
      }
      if (line.startsWith('# ')) {
        blocks.push(
          <h1 key={`h1-${idx}`} className="mt-3.5 mb-1.5 text-base font-bold text-foreground">
            {renderInlineContent(line.slice(2))}
          </h1>,
        )
        return
      }

      blocks.push(
        <p key={`p-${idx}`} className="my-1 leading-relaxed text-foreground">
          {renderInlineContent(line)}
        </p>,
      )
    })

    flushList()

    return (
      <div className={cn('space-y-1.5 text-sm leading-relaxed text-foreground', className)}>
        {blocks}
      </div>
    )
  } catch {
    return (
      <div
        className={cn(
          'whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground',
          className,
        )}
      >
        {content}
      </div>
    )
  }
}
