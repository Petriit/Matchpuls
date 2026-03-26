'use client'
import { useEffect } from 'react'
import Script from 'next/script'

declare global {
  interface Window {
    twemoji?: {
      parse: (el: HTMLElement | Node, options?: object) => void
    }
  }
}

const OPTS = {
  folder: 'svg',
  ext: '.svg',
  base: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/',
}

function parseTwemoji(el: HTMLElement | Node = document.body) {
  window.twemoji?.parse(el, OPTS)
}

export function TwemojiScript() {
  useEffect(() => {
    // Parse once on mount (script may already be loaded on client nav)
    parseTwemoji()

    // Watch for new nodes added by React (new posts, route changes, etc.)
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) parseTwemoji(node)
        })
      }
    })
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])

  return (
    <Script
      src="https://cdn.jsdelivr.net/npm/twemoji@14.0.2/dist/twemoji.min.js"
      crossOrigin="anonymous"
      strategy="afterInteractive"
      onLoad={() => parseTwemoji()}
    />
  )
}
