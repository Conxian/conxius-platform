import { describe, it, expect } from 'vitest';
import { Bip322Bridge } from '../lib/support/bip322';

describe('Bip322Bridge', () => {
  it('should validate a correct-looking address and signature', async () => {
    const result = await Bip322Bridge.verify(
      'bc1qztwy6xen3zdtt7z0vrgapmjtfz8acjkfp5fp7l',
      'Hello Conxian',
      'smp:BASE64_SIGNATURE_HERE'
    );
    expect(result.valid).toBe(true);
    expect(result.address).toBe('bc1qztwy6xen3zdtt7z0vrgapmjtfz8acjkfp5fp7l');
  });

  it('should reject an invalid bitcoin address', async () => {
    const result = await Bip322Bridge.verify(
      'invalid-address',
      'Hello Conxian',
      'smp:BASE64_SIGNATURE_HERE'
    );
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid Bitcoin address format');
  });

  it('should reject a malformed signature', async () => {
    const result = await Bip322Bridge.verify(
      'bc1qztwy6xen3zdtt7z0vrgapmjtfz8acjkfp5fp7l',
      'Hello Conxian',
      'short'
    );
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Malformed signature');
  });
});
