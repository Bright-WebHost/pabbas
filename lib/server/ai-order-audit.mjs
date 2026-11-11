const NUMBER_WORDS = new Map([
  ['a', 1], ['an', 1], ['one', 1], ['two', 2], ['three', 3], ['four', 4],
  ['five', 5], ['six', 6], ['seven', 7], ['eight', 8], ['nine', 9],
  ['ten', 10], ['couple', 2], ['pair', 2], ['dozen', 12],
])

function auditWords(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/don't/g, 'dont')
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
}

function isNearMatch(left, right) {
  if (left === right) return true
  if (left.length < 5 || right.length < 5 || Math.abs(left.length - right.length) > 1) return false

  let i = 0
  let j = 0
  let edits = 0
  while (i < left.length && j < right.length) {
    if (left[i] === right[j]) {
      i++
      j++
      continue
    }

    edits++
    if (edits > 1) return false
    if (left.length > right.length) i++
    else if (right.length > left.length) j++
    else {
      i++
      j++
    }
  }
  if (i < left.length || j < right.length) edits++
  return edits <= 1
}

function readQuantity(messageWords, start, end) {
  for (let i = start - 1; i >= Math.max(0, start - 3); i--) {
    if (/^\d+$/.test(messageWords[i])) return Number(messageWords[i])
    if (NUMBER_WORDS.has(messageWords[i])) return NUMBER_WORDS.get(messageWords[i])
    if (!['of', 'the', 'x'].includes(messageWords[i])) break
  }

  if (messageWords[end + 1] === 'x') {
    const quantity = messageWords[end + 2]
    if (/^\d+$/.test(quantity || '')) return Number(quantity)
    if (NUMBER_WORDS.has(quantity)) return NUMBER_WORDS.get(quantity)
  }
  return 1
}

function isNegated(messageWords, start) {
  return messageWords
    .slice(Math.max(0, start - 3), start)
    .some((word) => ['no', 'not', 'without', 'dont', 'don', 'never', 'skip', 'avoid'].includes(word))
}

function nameMatchesMenu(candidateName, menuName) {
  const candidateWords = auditWords(candidateName)
  const menuWords = auditWords(menuName)
  if (!candidateWords.length || candidateWords.length > menuWords.length) return false

  for (let start = 0; start <= menuWords.length - candidateWords.length; start++) {
    if (candidateWords.every((word, index) => isNearMatch(word, menuWords[start + index]))) return true
  }
  return false
}

export function recoverMentionedMenuItems(message, menuItems, parsedItems = []) {
  const messageWords = auditWords(message)
  if (!messageWords.length || !Array.isArray(menuItems)) return []

  const existingNames = parsedItems.map((item) => item?.name).filter(Boolean)
  const possibleMatches = []

  for (const item of menuItems) {
    const nameWords = auditWords(item?.name)
    const minimumLength = nameWords.length === 1 ? 1 : 2
    let bestLength = 0
    let itemMatches = []

    for (let length = nameWords.length; length >= minimumLength; length--) {
      const partialNames = []
      for (let nameStart = 0; nameStart <= nameWords.length - length; nameStart++) {
        partialNames.push(nameWords.slice(nameStart, nameStart + length))
      }

      for (const partialName of partialNames) {
        for (let messageStart = 0; messageStart <= messageWords.length - length; messageStart++) {
          const partialMessage = messageWords.slice(messageStart, messageStart + length)
          if (!partialName.every((word, index) => isNearMatch(word, partialMessage[index]))) continue
          if (isNegated(messageWords, messageStart)) continue
          if (length > bestLength) {
            bestLength = length
            itemMatches = []
          }
          if (length === bestLength) {
            itemMatches.push({
              item,
              start: messageStart,
              end: messageStart + length - 1,
              score: length * 2 - partialName.filter((word, index) => word !== partialMessage[index]).length,
            })
          }
        }
      }
      if (bestLength === length) break
    }

    possibleMatches.push(...itemMatches)
  }

  const bySpan = new Map()
  for (const match of possibleMatches) {
    const key = `${match.start}:${match.end}`
    const current = bySpan.get(key) || []
    current.push(match)
    bySpan.set(key, current)
  }

  const recovered = new Map()
  for (const matches of bySpan.values()) {
    const bestScore = Math.max(...matches.map((match) => match.score))
    const best = matches.filter((match) => match.score === bestScore)
    const distinctNames = new Set(best.map((match) => auditWords(match.item.name).join(' ')))
    if (distinctNames.size !== 1) continue

    const { item, start, end } = best[0]
    const normalizedName = auditWords(item.name).join(' ')
    if (existingNames.some((name) => nameMatchesMenu(name, item.name))) continue
    const quantity = readQuantity(messageWords, start, end)
    const prior = recovered.get(normalizedName)
    recovered.set(normalizedName, {
      name: item.name,
      quantity: Math.min(50, quantity + (prior?.quantity || 0)),
    })
  }

  return [...recovered.values()]
}

export function extractQuantityCorrections(message, menuItems, cartItems = []) {
  const messageWords = auditWords(message)
  if (!messageWords.length || !Array.isArray(cartItems) || !cartItems.length) return []

  const mentions = recoverMentionedMenuItems(message, menuItems)
  return mentions.filter((mention) => {
    const inCart = cartItems.some((line) => nameMatchesMenu(line?.item_name || line?.name, mention.name))
    if (!inCart) return false

    const nameWords = auditWords(mention.name)
    const start = messageWords.findIndex((_, index) =>
      index <= messageWords.length - nameWords.length &&
      nameWords.every((word, offset) => isNearMatch(word, messageWords[index + offset])),
    )
    if (start < 0) return false

    const prefix = messageWords.slice(Math.max(0, start - 4), start)
    const suffix = messageWords.slice(start + nameWords.length, start + nameWords.length + 5)
    const hasCorrectionVerb = prefix.some((word) => ['make', 'change', 'set', 'correct', 'update'].includes(word))
    const hasContrast = suffix.some((word) => ['not', 'instead', 'rather'].includes(word))
    return hasCorrectionVerb || hasContrast
  })
}
