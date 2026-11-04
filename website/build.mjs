/**
 * Builds the website in docs/ (GitHub Pages) from the templates in pages/
 * and one dictionary per language in i18n/: every language gets its own URL
 * (/ for English, /nl/, later /de/ and /es/), so search engines find each one.
 *
 *   node website/build.mjs
 *
 * A text in a template is {{t:key}}; the key is in every i18n/<lang>.json.
 * A language is published when languages.json says ready: true and its
 * dictionary has every key (a missing key stops the build and is named).
 * See website/README.md for adding a language.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const here = import.meta.dirname
const docs = join(here, '..', 'docs')
const SITE = 'https://coodoo.centrebrain.net'
const PAGES = ['index.html', 'disclaimer.html']
const EN_MANUAL = 'https://github.com/CentreBrain/coodoo/wiki/Welcome-to-Coodoo'
const today = new Date().toISOString().slice(0, 10)

const languages = JSON.parse(readFileSync(join(here, 'languages.json'), 'utf8'))
const live = languages.filter((l) => l.ready)
const dict = Object.fromEntries(live.map((l) => [l.code, JSON.parse(readFileSync(join(here, 'i18n', `${l.code}.json`), 'utf8'))]))

// every published language has every text: no page goes out half translated
const keys = Object.keys(dict.en)
for (const l of live) {
  const missing = keys.filter((k) => typeof dict[l.code][k] !== 'string' || !dict[l.code][k].trim())
  if (missing.length) {
    console.error(`✖ ${l.code}.json mist ${missing.length} tekst(en), bijvoorbeeld ${missing.slice(0, 5).join(', ')}`)
    process.exit(1)
  }
}

const url = (l, page) => `${SITE}${l.path}${page === 'index.html' ? '' : page}`
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
const plain = (html) => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()

function head(l, page, t, body) {
  const name = page.replace('.html', '')
  const title = t[`meta.${name}.title`]
  const description = t[`meta.${name}.description`]
  const share = t[`meta.${name}.share`] ?? description
  const alternates = [...live.map((o) => `<link rel="alternate" hreflang="${o.code}" href="${url(o, page)}">`), `<link rel="alternate" hreflang="x-default" href="${url(live[0], page)}">`]
  const ld =
    name === 'index'
      ? {
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'SoftwareApplication',
              '@id': `${SITE}/#app`,
              name: 'Coodoo',
              url: url(l, page),
              description,
              applicationCategory: 'DeveloperApplication',
              operatingSystem: 'macOS, Windows',
              inLanguage: l.code,
              image: `${SITE}/assets/og-image.png`,
              downloadUrl: 'https://github.com/CentreBrain/coodoo/releases/latest',
              offers: { '@type': 'Offer', price: '19.99', priceCurrency: 'EUR', description: t['ld.offer'], url: `${url(l, page)}#price` },
              publisher: { '@id': `${SITE}/#org` }
            },
            { '@type': 'Organization', '@id': `${SITE}/#org`, name: 'CentreBrain', url: `${SITE}/`, logo: `${SITE}/assets/logo.png`, sameAs: ['https://github.com/CentreBrain'] },
            {
              '@type': 'FAQPage',
              inLanguage: l.code,
              mainEntity: [...body.matchAll(/<summary>([\s\S]*?)<\/summary>\s*<p>([\s\S]*?)<\/p>/g)].map((m) => ({ '@type': 'Question', name: plain(m[1]), acceptedAnswer: { '@type': 'Answer', text: plain(m[2]) } }))
            }
          ]
        }
      : { '@context': 'https://schema.org', '@type': 'WebPage', name: plain(title), url: url(l, page), inLanguage: l.code, dateModified: today, isPartOf: { '@type': 'WebSite', name: 'Coodoo', url: `${SITE}/` }, publisher: { '@type': 'Organization', name: 'CentreBrain' } }
  return [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}">`,
    '<meta name="robots" content="index, follow, max-image-preview:large">',
    '<meta name="author" content="CentreBrain">',
    '<meta name="theme-color" content="#3574f0">',
    `<link rel="canonical" href="${url(l, page)}">`,
    ...alternates,
    `<meta property="og:type" content="${name === 'index' ? 'website' : 'article'}">`,
    '<meta property="og:site_name" content="Coodoo">',
    `<meta property="og:url" content="${url(l, page)}">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(share)}">`,
    `<meta property="og:image" content="${SITE}/assets/og-image.png">`,
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    ...(t[`meta.${name}.imageAlt`] ? [`<meta property="og:image:alt" content="${esc(t[`meta.${name}.imageAlt`])}">`] : []),
    `<meta property="og:locale" content="${l.locale}">`,
    ...live.filter((o) => o !== l).map((o) => `<meta property="og:locale:alternate" content="${o.locale}">`),
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${esc(title)}">`,
    `<meta name="twitter:description" content="${esc(share)}">`,
    `<meta name="twitter:image" content="${SITE}/assets/og-image.png">`,
    '<link rel="apple-touch-icon" href="/assets/logo.png">',
    `<script type="application/ld+json">${JSON.stringify(ld)}</script>`
  ].join('\n')
}

/** EN | NL | …: plain links, so every language is one click and one URL away. */
const langnav = (l, page) =>
  `<nav class="lang" aria-label="Language">${live.map((o) => `<a href="${o.path}${page === 'index.html' ? '' : page}" hreflang="${o.code}" lang="${o.code}" data-lang-link="${o.code}"${o === l ? ' aria-current="page"' : ''}>${o.code.toUpperCase()}</a>`).join('')}</nav>`

function script(l, page, t) {
  const other = live.filter((o) => o.code !== 'en').map((o) => ({ code: o.code, path: o.path }))
  const common = `
  document.querySelector('[data-year]').textContent = new Date().getFullYear()
  // a language the visitor picks is remembered
  document.querySelectorAll('[data-lang-link]').forEach((a) => a.addEventListener('click', () => {
    try { localStorage.setItem('coodoo-lang', a.dataset.langLink) } catch {}
  }))${
    l.code === 'en'
      ? `
  // the first visit in another language: once to that language's page (a choice made before always wins)
  ;(() => {
    let saved = null
    try { saved = localStorage.getItem('coodoo-lang') } catch {}
    if (saved === 'en' || document.referrer.startsWith(location.origin)) return
    const want = saved || (navigator.language || '').slice(0, 2).toLowerCase()
    const to = ${JSON.stringify(other)}.find((o) => o.code === want)
    if (to) location.replace(to.path + location.pathname.split('/').pop() + location.hash)
  })()`
      : ''
  }`
  if (page !== 'index.html') return `<script>${common}\n</script>`
  return `<script>
  const T = ${JSON.stringify({ version: t['js.version'], versionLine: t['js.versionLine'], date: l.date })}${common}

  // this visitor's computer goes first
  const ua = navigator.userAgent
  const os = /Windows/i.test(ua) ? 'win' : /Mac/i.test(ua) ? 'mac' : ''
  if (os) {
    const box = document.querySelector('.dl')
    const mine = [...box.children].filter((a) => a.dataset.os === os)
    mine.forEach((a) => a.classList.add('mine'))
    mine.reverse().forEach((a) => box.prepend(a))
  }

  // the newest version and its files, straight from GitHub
  fetch('https://api.github.com/repos/CentreBrain/coodoo/releases/latest')
    .then((r) => (r.ok ? r.json() : Promise.reject()))
    .then((rel) => {
      const v = rel.tag_name.replace(/^v/, '')
      const find = (test) => rel.assets.find((a) => test(a.name))
      const files = {
        'arm64.dmg': find((n) => /arm64\\.dmg$/.test(n)),
        'intel.dmg': find((n) => /\\.dmg$/.test(n) && !/arm64/.test(n)),
        exe: find((n) => /\\.exe$/.test(n))
      }
      document.querySelectorAll('[data-asset]').forEach((a) => {
        const f = files[a.dataset.asset]
        if (!f) return
        a.href = f.browser_download_url
        a.querySelector('.file').textContent = \`\${f.name} · \${Math.round(f.size / 1048576)} MB\`
      })
      const date = new Date(rel.published_at).toLocaleDateString(T.date, { day: 'numeric', month: 'long', year: 'numeric' })
      document.querySelector('[data-version]').textContent = T.version.replace('{v}', v).replace('{date}', date)
      document.querySelector('[data-version-line]').textContent = T.versionLine.replace('{v}', v)
      // the big button downloads straight away for Windows; on a Mac the choice between chips stays below
      if (os === 'win' && files.exe) document.querySelector('[data-hero-download]').href = files.exe.browser_download_url
    })
    .catch(() => {})
</script>`
}

for (const l of live) {
  const t = dict[l.code]
  for (const page of PAGES) {
    let html = readFileSync(join(here, 'pages', page), 'utf8')
    html = html.replace(/\{\{t:([\w.]+)\}\}/g, (_, k) => {
      if (t[k] === undefined) throw new Error(`${page}: tekst ${k} ontbreekt`)
      // in a span, as before: a text with bold or a link stays one piece in a flex row
      return `<span>${t[k]}</span>`
    })
    // the manual in this language (English until there is one)
    html = html.replaceAll(`href="${EN_MANUAL}" data-manual`, `href="${l.manual}"`).replaceAll('{{manual}}', l.manual)
    html = html.replace('{{lang}}', l.code).replace('{{langnav}}', langnav(l, page)).replace('{{script}}', script(l, page, t))
    html = html.replace('{{head}}', head(l, page, t, html))
    const out = join(docs, l.path, page)
    mkdirSync(dirname(out), { recursive: true })
    writeFileSync(out, html)
  }
}

// the sitemap: every page in every published language, with its alternates
const entries = PAGES.flatMap((page) =>
  live.map(
    (l) => `  <url>
    <loc>${url(l, page)}</loc>
    <lastmod>${today}</lastmod>
${live.map((o) => `    <xhtml:link rel="alternate" hreflang="${o.code}" href="${url(o, page)}"/>`).join('\n')}
    <xhtml:link rel="alternate" hreflang="x-default" href="${url(live[0], page)}"/>
  </url>`
  )
)
writeFileSync(join(docs, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries.join('\n')}\n</urlset>\n`)
console.log(`✔ ${live.map((l) => l.code).join(', ')}: ${PAGES.length} pagina's per taal in docs/`)
