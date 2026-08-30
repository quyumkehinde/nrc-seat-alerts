import type { Station } from './nrc.ts'

/**
 * Snapshot of the LI line, used only when the API is unreachable, so a blip
 * upstream cannot take the signup page down. A live response always wins.
 */
export const FALLBACK_STATIONS: Station[] = [
  { id: '004a3e07-0b8b-4963-a7da-d6ddda455237', name: 'Mobolaji Johnson Station Ebute Metta', code: 'MJS' },
  { id: '488cdf70-4045-4496-99da-87407cdadd5e', name: 'Babatunde Raji Fashola Station Agege', code: 'BRF' },
  { id: '7a84498b-70d1-42c7-84d3-984d636a4ed2', name: 'Lateef Kayode Jakande Station Agbado', code: 'LKJ' },
  { id: 'd46fc91e-3727-49f6-922a-3214bb03283f', name: 'Professor Yemi Oshinbajo Station Kajola', code: 'PYO' },
  { id: '732d176d-6e4e-4c69-b6c1-bcb0d6ae51b8', name: 'Olu Funmilayo Ransome Kuti Papalanto', code: 'ORK' },
  { id: '57d7d1f6-0d37-4c47-abf6-5549f87eef26', name: 'Professor Wole Soyinka Station Abeokuta', code: 'PWS' },
  { id: 'cc0763d9-7968-44b4-a8dd-e41d21a1350c', name: 'Aremo Olusegun Osoba Olodo', code: 'AOO' },
  { id: '8a4a5c24-4b12-436e-8a8f-ca52818c4fa8', name: 'Ladoke Akintola Station Omi-Adio', code: 'LA' },
  { id: 'ec4334a8-2c00-401f-a77e-fc2585fc55d3', name: 'Obafemi Awolowo Station Moniya', code: 'OA' },
]
