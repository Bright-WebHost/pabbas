import test from 'node:test'
import assert from 'node:assert/strict'
import { extractQuantityCorrections, recoverMentionedMenuItems } from '../lib/server/ai-order-audit.mjs'

const menu = [
  { name: 'Dubai Chocolate', price: 280 },
  { name: 'Golden Gadbad', price: 260 },
  { name: 'Fresh Lime Soda', price: 60 },
]

test('recovers explicitly requested items omitted by the assistant, including clear typos and shortened names', () => {
  const recovered = recoverMentionedMenuItems(
    'Need food for 4 of us: 2 Dubai choclate, one golden gadbad n 3 lime soda. can u sort it?',
    menu,
    [{ name: 'Golden Gadbad', quantity: 1 }],
  )

  assert.deepEqual(recovered, [
    { name: 'Dubai Chocolate', quantity: 2 },
    { name: 'Fresh Lime Soda', quantity: 3 },
  ])
})

test('does not recover items the customer explicitly rejected', () => {
  const recovered = recoverMentionedMenuItems(
    "Add one Golden Gadbad, but don't add Dubai Chocolate",
    menu,
    [{ name: 'Golden Gadbad', quantity: 1 }],
  )

  assert.deepEqual(recovered, [])
})

test('does not guess between menu items sharing the same phrase', () => {
  const recovered = recoverMentionedMenuItems(
    'Add one Mango Shake',
    [{ name: 'Mango Shake' }, { name: 'Mango Shake Large' }],
  )

  assert.deepEqual(recovered, [])
})

test('reads correction language as an absolute quantity for an item already in the cart', () => {
  const corrections = extractQuantityCorrections(
    'Actually make that 3 Dubai Chocolate, not 2. Keep everything else same.',
    menu,
    [{ item_name: 'Dubai Chocolate', quantity: 2 }],
  )

  assert.deepEqual(corrections, [{ name: 'Dubai Chocolate', quantity: 3 }])
})
