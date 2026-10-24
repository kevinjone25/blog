import type { Element, ElementContent, Root } from 'hast'
import { visit } from 'unist-util-visit'

const hasClass = (node: Element, name: string) =>
  Array.isArray(node.properties?.className) && node.properties.className.includes(name)

// Collect text, skipping nested lists
const collectText = (nodes: ElementContent[]): string =>
  nodes
    .map((n) => {
      if (n.type === 'text') return n.value
      if (n.type === 'element' && n.tagName !== 'ul' && n.tagName !== 'ol') return collectText(n.children)
      return ''
    })
    .join('')

// Give task-list checkboxes an accessible name taken from the item text
export default function rehypeTaskListLabels() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'li' || !hasClass(node, 'task-list-item')) return
      const input = node.children.find(
        (c): c is Element =>
          c.type === 'element' && c.tagName === 'input' && c.properties?.type === 'checkbox'
      )
      if (!input) return
      const label = collectText(node.children).replace(/\s+/g, ' ').trim()
      if (label) input.properties.ariaLabel = label
    })
  }
}
