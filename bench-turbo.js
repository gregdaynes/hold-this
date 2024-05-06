import Hold from './index.js'
import crypto from 'node:crypto'

export default function benchTurbo (holder) {
  holder ||= Hold({ turbo: true })
  const records = []

  function record (rec, time) {
    records.push({
      'Time (ms)': time,
      'Record Count': rec,
      'Recods per ms': Number((rec / time).toFixed(3))
    })
  }

  function run (count) {
    const tableName = crypto.createHash('sha1').update(('b' + new Date().valueOf() + count)).digest('hex')
    holder.init(tableName, 'keyX', 'valueX')

    const entries = Array.from(Array(count)).map((_, i) => holder.prepare(tableName, `key${i}`, `value${i}`))

    const start = performance.now()
    holder.setBulk(tableName, 'keyX', entries)

    return performance.now() - start
  }

  function bisect (a, b) {
    if ((b - a) <= 1000) return Math.round((a + b) / 2)

    const c = Math.round((a + b) / 2)

    const cTime = run(c)
    if (cTime < 1000) {
      record(c, cTime)
      return bisect(c, Math.round(b * 1.02), 'c')
    }

    const aTime = run(a)
    if (aTime < 1000) {
      record(a, aTime)
      return bisect(a, c, 'a')
    }

    return bisect(Math.round(a * 0.98), c, null)
  }

  bisect(1, 150000, null)

  return records.sort((a, b) => b['Recods per ms'] - a['Recods per ms']).slice(0, 3)
}
