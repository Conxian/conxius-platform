# Platform Economy Rework and Wallet Decoupling

## Decision
The universal platform is economically neutral and wallet-independent. `conxian-business` governs portfolio policy; runtime economic behavior remains client/protocol-owned and independently evidenced.

## In scope
- remove wallet as an active platform dependency;
- declare excluded wallet, custody, signing, treasury, yield, pricing, trading, and protocol-economics capabilities;
- define explicit no-default-economics behavior;
- validate runtime code against prohibited platform economics;
- preserve historical references as non-authoritative.

## Out of scope
This change does not delete external repositories, implement wallet signing, operate a treasury, set fees, or introduce a replacement financial product.

## Acceptance
Platform checks fail closed when prohibited capability markers or active wallet dependencies are introduced. Any future infrastructure fee requires separate governance approval, customer disclosure, external configuration, and auditable evidence.
