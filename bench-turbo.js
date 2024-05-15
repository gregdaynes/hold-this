import { styleText } from 'node:util'
import Hold from './index.js'
import crypto from 'node:crypto'

export default function benchTurbo (holder, {
  targetTime = 500,
  threshold = 1000,
  maxRuns = 10,
  growth = 1.01,
  retraction = 0.99,
  lower = 1,
  upper = 1000000
} = {}) {
  const records = []
  let runCount = 0

  function log ({ a, b, c, time, col = null }) {
    const pad = (str) => `${str}`.padStart(('' + upper).length, ' ')
    const aStr = col === 'a' ? styleText('green', pad(a)) : pad(a)
    const bStr = col === 'b' ? styleText('green', pad(b)) : pad(b)
    const cStr = col === 'c' ? styleText('green', pad(c)) : pad(c)
    const timeStr = time < targetTime ? time.toFixed(3) : styleText('red', time.toFixed(3))

    console.log(`Run: ${('' + runCount).padStart(('' + maxRuns).length, ' ')} |`, aStr, cStr, bStr, '|', timeStr + 'ms')
  }

  function record ({ a, c, b, time, col }) {
    log(...arguments)

    records.push({
      Run: runCount,
      'Time (ms)': Number(time.toFixed(3)),
      'Record Count': arguments[0][col],
      'Recods per ms': Number((arguments[0][col] / time).toFixed(3))
    })
  }

  function run (count) {
    const db = Hold({ turbo: true })

    const tableName = crypto.createHash('sha1').update(('b' + new Date().valueOf() + count)).digest('hex')
    db.init(tableName, 'keyX', 'valueX')

    const entries = Array.from(Array(count)).map((_, i) => db.prepare(tableName, `key${i}`, `value${i}`))

    const start = performance.now()
    db.setBulk(tableName, 'keyX', entries)

    return performance.now() - start
  }

  function bisect (a, b) {
    runCount++
    if ((b - a) <= threshold || runCount > maxRuns) return Math.round((a + b) / 2)

    const c = Math.round((a + b) / 2)
    const cTime = run(c)

    if (cTime < targetTime) {
      record({ a, c, b, time: cTime, col: 'c' })
      return bisect(c, Math.round(b * growth), 'c')
    }

    const aTime = run(a)
    if (aTime < targetTime) {
      record({ a, b, c, time: aTime, col: 'a' })
      return bisect(a, c, 'a')
    }

    log({ a, c, b, time: cTime })
    return bisect(Math.round(a * retraction), c, null)
  }

  bisect(lower, upper, null)

  return records.sort((a, b) => b['Recods per ms'] - a['Recods per ms']).slice(0, 3)
}
