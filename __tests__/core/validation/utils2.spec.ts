import {determineRecipientType} from '@/core/validation/utils2'
import {RECIPIENT_TYPES} from '@/core/model'

describe('validation utils', () => {
  it('determineRecipientType should return a correct value', () => {
    const validAddress1 = 'SD4GWLPNPHVJMCV3ZL2BXGNVRT6XMGYMP6KWI5JB'
    const validAddress2 = 'SD4GWL-PNPHVJ-MCV3ZL-2BXGNV-RT6XMG-YMP6KW-I5JB'
    const validAddress3 = 'sd4gwlpnphvjmcv3zl2bxgnvrt6xmgymp6kwi5jb'
    const validAddress4 = 'sd4gwl-pnphvj-mcv3zl-2bxgnv-rt6xmg-ymp6kw-i5jb'
    const validPublicKey1 = 'A3C001E2E98A881D2DE79EDF39B0C242E637FC07AB587AD38C5D6D27675642BC'
    const validPublicKey2 = 'a3c001e2e98a881d2de79edf39b0c242e637fc07ab587ad38c5d6d27675642bc'
    const validAlias = 'thisisavalidalias'
    const invalidAlias = 'ThisIsNotAValidAlias'
    const tooLong = 'A3C001E2E98A881D2DE79EDF39B0C242E637FC07AB587AD38C5D6D27675642BCE'
    const emptyString = ''
    const undefinedVar = undefined

    expect(determineRecipientType(validAddress1)).toBe(RECIPIENT_TYPES.ADDRESS)
    expect(determineRecipientType(validAddress2)).toBe(RECIPIENT_TYPES.ADDRESS)
    expect(determineRecipientType(validAddress3)).toBe(RECIPIENT_TYPES.ADDRESS)
    expect(determineRecipientType(validAddress4)).toBe(RECIPIENT_TYPES.ADDRESS)
    expect(determineRecipientType(validPublicKey1)).toBe(RECIPIENT_TYPES.PUBLIC_KEY)
    expect(determineRecipientType(validPublicKey2)).toBe(RECIPIENT_TYPES.PUBLIC_KEY)
    expect(determineRecipientType(validAlias)).toBe(RECIPIENT_TYPES.ALIAS)
    expect(() => { determineRecipientType(invalidAlias) }).toThrow();
    expect(() => { determineRecipientType(tooLong) }).toThrow();
    expect(() => { determineRecipientType(emptyString) }).toThrow();
    expect(() => { determineRecipientType(undefinedVar) }).toThrow();
  })
})

