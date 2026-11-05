import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getSaudiVatNumberError,
  isValidSaudiVatNumber,
  normalizeSaudiVatNumber
} from './saudiVatNumber';

test('accepts and normalizes a valid Saudi VAT number', () => {
  assert.equal(isValidSaudiVatNumber('300099887700003'), true);
  assert.equal(normalizeSaudiVatNumber('٣٠٠٠٩٩٨٨٧٧٠٠٠٠٣'), '300099887700003');
});

test('rejects Saudi VAT numbers with an invalid length or boundary digit', () => {
  assert.equal(isValidSaudiVatNumber('30009988770000'), false);
  assert.equal(isValidSaudiVatNumber('200099887700003'), false);
  assert.notEqual(getSaudiVatNumberError('300099887700004'), null);
});
