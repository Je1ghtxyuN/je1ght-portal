const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const { JSDOM } = require('jsdom')

const runtimePath = path.resolve(
  __dirname,
  '../source/js/portal-site-runtime.js',
)
const runtime = fs.existsSync(runtimePath)
  ? fs.readFileSync(runtimePath, 'utf8')
  : ''

function createRuntimeDom() {
  const dom = new JSDOM(
    '<span id="site-running-time" data-site-started="2025-06-25"></span>',
    { runScripts: 'outside-only', url: 'https://je1ght.top/' },
  )
  const subscriptions = []

  dom.window.Date = class FixedDate extends Date {
    constructor(value) {
      super(value === undefined ? '2026-06-26T01:02:03Z' : value)
    }

    static now() {
      return new Date('2026-06-26T01:02:03Z').getTime()
    }
  }
  dom.window.setInterval = (callback, milliseconds) => {
    dom.window.runtimeInterval = { callback, milliseconds }
    return 1
  }
  dom.window.PortalLocale = {
    subscribe(listener) {
      subscriptions.push(listener)
      return () => {}
    },
    t(_key, fallback, params) {
      return `本站已运行 ${params.years} 年 ${params.days} 天 ${params.hours} 时 ${params.minutes} 分 ${params.seconds} 秒`
        || fallback
    },
  }
  dom.window.eval(runtime)
  return { dom, subscriptions }
}

test('site runtime immediately renders the elapsed time and updates each second', () => {
  const { dom } = createRuntimeDom()
  const output = dom.window.document.getElementById('site-running-time')

  assert.equal(output.textContent, '本站已运行 1 年 1 天 01 时 02 分 03 秒')
  assert.equal(dom.window.runtimeInterval.milliseconds, 1000)

  output.textContent = ''
  dom.window.runtimeInterval.callback()
  assert.equal(output.textContent, '本站已运行 1 年 1 天 01 时 02 分 03 秒')
})

test('site runtime refreshes after locale changes and PJAX navigation', () => {
  const { dom, subscriptions } = createRuntimeDom()
  const document = dom.window.document

  assert.equal(subscriptions.length, 1)
  document.getElementById('site-running-time').replaceWith(
    Object.assign(document.createElement('span'), {
      id: 'site-running-time',
    }),
  )
  document
    .getElementById('site-running-time')
    .setAttribute('data-site-started', '2025-06-25')

  document.dispatchEvent(new dom.window.CustomEvent('pjax:complete'))
  assert.match(
    document.getElementById('site-running-time').textContent,
    /^本站已运行 1 年 1 天/,
  )

  document.getElementById('site-running-time').textContent = ''
  subscriptions[0]()
  assert.match(
    document.getElementById('site-running-time').textContent,
    /^本站已运行 1 年 1 天/,
  )
})
