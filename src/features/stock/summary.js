/**
 * Plain-English company summary: what it does, how it makes money,
 * and whether the numbers are improving — generated from profile + metrics.
 */
import { isNum } from '../../lib/format'

const MONEY = [
  [/software|saas|cloud/i, 'subscriptions and licenses for its software'],
  [/semiconductor/i, 'selling chips and related hardware to device makers and data centers'],
  [/bank/i, 'the spread between interest earned on loans and paid on deposits, plus fees'],
  [/credit services|payment/i, 'fees on payment volume and interest on balances'],
  [/insurance/i, 'collecting premiums and earning investment income on reserves'],
  [/capital markets|asset management/i, 'management and transaction fees on client assets'],
  [/retail|stores|internet retail/i, 'selling goods to consumers, in stores and online'],
  [/restaurants/i, 'restaurant sales and franchise royalties'],
  [/auto/i, 'vehicle sales, financing and services'],
  [/drug|pharma|biotech/i, 'selling prescription medicines and licensing therapies'],
  [/medical|diagnostics|devices|instruments/i, 'selling medical devices, instruments and consumables to hospitals and labs'],
  [/healthcare plans/i, 'insurance premiums and health-services fees'],
  [/entertainment|media/i, 'subscriptions, advertising and content licensing'],
  [/internet content|advertising/i, 'advertising sold against its audience, plus subscriptions and cloud services'],
  [/telecom/i, 'monthly wireless and broadband subscriptions'],
  [/oil|gas|energy/i, 'producing and selling oil, gas and refined products'],
  [/utilities/i, 'regulated rates charged for electricity and gas delivery'],
  [/reit|real estate/i, 'rent collected on the properties it owns'],
  [/aerospace|defense/i, 'long-term contracts for aircraft, engines and defense systems'],
  [/railroad|freight|logistics/i, 'fees for moving freight across its network'],
  [/machinery|construction/i, 'selling heavy equipment and the parts and services that follow'],
  [/beverage|food|tobacco|household/i, 'selling branded consumer products through retailers'],
  [/chemicals|materials|copper|gold/i, 'selling industrial materials, often priced off commodity markets'],
  [/consumer electronics/i, 'selling devices and a growing stream of services attached to them'],
  [/travel/i, 'commissions and fees on bookings'],
]

export function buildSummary(snap) {
  if (!snap) return null
  const m = snap.metrics || {}
  const desc = (snap.description || '').replace(/\s+/g, ' ').trim()
  const sentences = desc.match(/[^.!?]+[.!?]+/g) || [desc]
  const what = sentences.slice(0, 2).join(' ').trim()
  const money = MONEY.find(([re]) => re.test(`${snap.industry || ''} ${snap.sector || ''}`))?.[1] || `selling products and services in the ${(snap.industry || snap.sector || 'its').toLowerCase()} market`

  const good = [], bad = []
  const pct = (v) => `${Math.abs(v).toFixed(0)}%`
  if (isNum(m.salesYoY)) (m.salesYoY >= 0 ? good : bad).push(`revenue ${m.salesYoY >= 0 ? 'grew' : 'fell'} ${pct(m.salesYoY)} over the past year`)
  if (isNum(m.epsYoY)) (m.epsYoY >= 0 ? good : bad).push(`earnings per share ${m.epsYoY >= 0 ? 'rose' : 'dropped'} ${pct(m.epsYoY)}`)
  if (isNum(m.profitMargin)) (m.profitMargin >= 10 ? good : m.profitMargin < 0 ? bad : []).push(m.profitMargin >= 10 ? `it keeps ${pct(m.profitMargin)} of sales as profit` : 'it is currently losing money')
  if (isNum(m.debtEq)) (m.debtEq <= 1 ? good : bad).push(m.debtEq <= 1 ? 'debt is modest relative to equity' : 'it carries a heavy debt load')
  let verdict = 'The numbers are mixed.'
  if (good.length && !bad.length) verdict = 'Overall, the numbers are improving.'
  else if (bad.length && !good.length) verdict = 'Overall, the numbers are getting worse.'
  else if (good.length > bad.length) verdict = 'On balance, the numbers are improving.'
  else if (bad.length > good.length) verdict = 'On balance, the numbers are weakening.'
  const trend = [...good, ...bad]
  const trendText = trend.length ? `${trend[0].charAt(0).toUpperCase() + trend[0].slice(1)}${trend.length > 1 ? ', ' + trend.slice(1, 3).join(', ') : ''}. ${verdict}` : 'Not enough financial history to judge the trend yet.'
  return { what: what || `${snap.name} is listed on the ${snap.exchange}.`, money: `It makes money mainly from ${money}.`, trend: trendText, improving: good.length > bad.length ? true : bad.length > good.length ? false : null }
}
