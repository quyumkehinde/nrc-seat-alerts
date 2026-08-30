/**
 * Live payloads rather than fixtures on purpose: the point is catching the
 * day the API changes shape.
 */
import assert from 'node:assert/strict'
import test from 'node:test'
import { findMatches } from '../lib/match.ts'
import { searchTrips, type Trip } from '../lib/nrc.ts'

const EBUTE_METTA = '004a3e07-0b8b-4963-a7da-d6ddda455237'
const MONIYA = 'ec4334a8-2c00-401f-a77e-fc2585fc55d3'

const any = { vehicleCode: '', coachType: '' }

/** A date with seats and one without. */
async function findDates() {
  const start = new Date()
  let soldOut: Trip[] | undefined
  let open: Trip[] | undefined

  for (let i = 0; i < 8 && (!soldOut || !open); i++) {
    const date = new Date(start.getTime() + i * 864e5).toISOString().slice(0, 10)
    const trips = await searchTrips(EBUTE_METTA, MONIYA, date)
    if (trips.length === 0) continue
    const hasSeats = trips.some((t) => t.coaches.some((c) => c.availableSeats > 0))
    if (hasSeats) open ??= trips
    else soldOut ??= trips
  }
  return { soldOut, open }
}

const { soldOut, open } = await findDates()

test('sold-out trips never produce an alert', { skip: !soldOut && 'no sold-out date in window' }, () => {
  assert.equal(findMatches(any, soldOut!).length, 0)
  assert.equal(findMatches({ vehicleCode: 'LI1', coachType: 'First Class' }, soldOut!).length, 0)
})

test('trips with seats produce an alert', { skip: !open && 'no available date in window' }, () => {
  const matches = findMatches(any, open!)
  assert.ok(matches.length > 0, 'expected at least one matching trip')
  for (const { coaches } of matches) {
    assert.ok(coaches.every((c) => c.availableSeats > 0), 'only free coaches should match')
  }
})

test('the train filter narrows to that train', { skip: !open && 'no available date in window' }, () => {
  const code = open![0].vehicleCode
  const matches = findMatches({ vehicleCode: code, coachType: '' }, open!)
  assert.ok(matches.every((m) => m.trip.vehicleCode === code))
  assert.equal(findMatches({ vehicleCode: 'NOPE', coachType: '' }, open!).length, 0)
})

test('the class filter narrows to that class', { skip: !open && 'no available date in window' }, () => {
  const matches = findMatches({ vehicleCode: '', coachType: 'Standard Class' }, open!)
  for (const { coaches } of matches) {
    assert.deepEqual([...new Set(coaches.map((c) => c.coachTypeName))], ['Standard Class'])
  }
})

test('no trips means no alert', () => {
  assert.equal(findMatches(any, []).length, 0)
})

test('a date with no service returns no trips', async () => {
  assert.deepEqual(await searchTrips(EBUTE_METTA, MONIYA, '2020-01-01'), [])
})
