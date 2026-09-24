# Development Notes

Rationale and design notes that don't belong as inline comments in the contracts. Organized by file.

## NirmalaPair.sol

All 8 functions from PRD bagian 8 are implemented: `getReserves`, `initialize`, `_update`, `mint`, `burn`, `swap`, `skim`, `sync`. Built incrementally, one function per session step, each verified with `forge build`/`forge test`/`forge fmt --check` before moving to the next.

Deviations from the Uniswap V2 reference (`UniswapV2Pair.sol`), all deliberate:
- `factory` is `immutable`, not a mutable state var — Uniswap V2 only used mutable because Solidity 0.5.16 had no `immutable` keyword, not because it needs to change.
- `initialize()` has an extra guard (`token0 == address(0)`) beyond the `msg.sender == factory` check, so a hypothetical double-call from a buggy future `NirmalaFactory` can't silently re-point an already-initialized pair.
- Reentrancy: OZ `ReentrancyGuard`/`nonReentrant`, not the custom `lock` modifier from the reference.
- Token transfers: OZ `SafeERC20.safeTransfer`, not a hand-rolled `_safeTransfer`.
- `_update()` is `internal`, not `private` — needed so `NirmalaPairHarness` (test-only, in `test/NirmalaPairTest.t.sol`) can exercise it directly before `mint`/`burn`/`swap`/`sync` existed to call it for real.
- No protocol fee at all (`_mintFee`/`kLast`/`feeTo` don't exist anywhere) — PRD bagian 5 locked this early; `mint()`/`burn()` are correspondingly simpler than the reference. `swap()` never touched fee-on logic in the reference either, so it needed no reduction.
- Custom errors throughout, using `require(condition, CustomError())` (Solidity 0.8.26+ sugar) rather than `if (bad) revert CustomError();` — user's explicit style preference, see `[[feedback_dex_require_custom_error_style]]`.

Lint suppressions:
- `unsafe-typecast` on `reserve0 = uint112(balance0)` / `reserve1 = uint112(balance1)` in `_update()` — safe because the `require(balance0 <= type(uint112).max && balance1 <= type(uint112).max, NirmalaPair__Overflow())` a few lines above already bounds both values, so the cast can't silently truncate.

`swap()`'s two `{ }` scoping blocks are kept from the reference — not just style, they're needed to avoid "stack too deep" on the default (non-`viaIR`) compiler pipeline given how many locals the function has.

## NirmalaFactory.sol

Deploy pair via `CREATE2`, tracking `getPair`/`allPairs`. Sesuai PRD bagian 9.

Deviasi dari reference (`UniswapV2Factory.sol`), semua disengaja:
- **`new NirmalaPair{salt: ...}()`**, bukan inline `assembly { create2(...) }`. Di 0.8.x hasil alamat/bytecode-nya identik dengan assembly CREATE2, tapi otomatis revert kalau deploy gagal (assembly cuma balikin `address(0)` diam-diam kalau gagal) dan type-safe — nggak perlu decode return data manual.
- **Custom error + `require(cond, Error())`**, konsisten sama style `NirmalaPair.sol` — `NirmalaFactory__IdenticalAddresses`, `NirmalaFactory__ZeroAddress`, `NirmalaFactory__PairExists`.
- **Tidak ada `feeTo`/`feeToSetter`/`setFeeTo`** — PRD bagian 5 (no protocol fee, no admin sama sekali).
- **Cek `tokenA != tokenB` di paling awal**, sebelum sorting — kalau dilewat, `createPair(tokenX, tokenX)` bisa lolos (sorting hasilnya `token0 == token1`, keduanya bukan `address(0)`, dan `getPair[tokenX][tokenX]` awalnya kosong) sehingga pair token vs dirinya sendiri ke-deploy. Uniswap V2 asli juga nge-cek ini di baris pertama.
- **Event `PairCreated`** ditambah `pairIndex` (`allPairs.length` setelah push) — sama seperti reference, tapi disebut eksplisit karena awalnya nggak ada di draft plan user, dikonfirmasi lewat pertanyaan sebelum implementasi.

Trust assumption: `createPair` menerima address apa aja termasuk non-contract atau token jahat — sama kayak Uniswap V2, risiko divalidasi di level pair/router, bukan di factory. `nonReentrant` sengaja tidak dipakai — satu-satunya external call di `createPair` adalah ke kontrak yang baru di-deploy sendiri (`initialize`), bukan ke token/user, jadi tidak ada permukaan reentrancy.

Init code hash `NirmalaPair` konstan (`NirmalaToken` hardcode `"Nirmala LP"`/`"NIR-LP"` di constructor, `NirmalaPair` constructor kosong) — dipakai buat prediksi alamat pair via CREATE2, nanti relevan buat `NirmalaLibrary.pairFor()`.

Test (`test/NirmalaFactoryTest.t.sol`): 16 test — happy path, sorting, cek `getPair` dua arah, event, prediksi alamat CREATE2 (`vm.computeCreate2Address`), tiga revert case (identical/zero/exists, termasuk urutan argumen dibalik), integrasi (createPair → mint liquidity beneran lewat pair hasil factory), dan 1 fuzz test buat sorting + prediksi alamat.

## src/libraries/NirmalaLibrary.sol

Setara `UniswapV2Library`. Sesuai PRD bagian 10.

Deviasi dari reference (`UniswapV2Library.sol`), semua disengaja:
- **`getReserves()` return sesuai urutan input caller** (`tokenA`/`tokenB`), bukan urutan sorted `token0`/`token1` — sorting cuma dipakai internal buat `pairFor`. Sama kayak reference asli (dikonfirmasi lewat diskusi, awalnya sempat ambigu di draft plan).
- **`getAmountIn()` punya require eksplisit `amountOut < reserveOut`** → `NirmalaLibrary__InsufficientLiquidity`. Reference asli cuma dapet underflow otomatis dari `SafeMath`; di 0.8.x defaultnya jadi panic 0x11 yang nggak informatif, jadi ditambah require biar dapet custom error yang jelas.
- **`NirmalaFactory.createPair()` TIDAK di-refactor** manggil `NirmalaLibrary.sortTokens()` — logic-nya identik (sengaja duplikat) supaya perubahan di library nggak berisiko ke kontrak yang custody dana. Kalau suatu saat mau di-DRY-kan, itu perubahan terpisah yang perlu di-review sendiri.
- Custom error + `require(cond, Error())`, konsisten style `NirmalaPair.sol`/`NirmalaFactory.sol`.

**`PAIR_INIT_CODE_HASH`** — di-hardcode sebagai `bytes32 constant` (bukan dihitung ulang tiap panggil via `keccak256(type(NirmalaPair).creationCode)`), karena `pairFor()` dipanggil berkali-kali per transaksi (tiap hop di `getAmountsOut`/`getAmountsIn`) dan ngitung hash dari seluruh creation code kontrak tiap kali itu mahal. Nilai didapat dari `forge inspect NirmalaPair bytecode | cast keccak`, lalu diverifikasi identik dengan `keccak256(type(NirmalaPair).creationCode)` lewat test guard (`test_pairInitCodeHash_matchesNirmalaPairCreationCode`) — kalau `NirmalaPair.sol` berubah di masa depan, test ini gagal duluan sebelum sempat ke-deploy dengan hash yang salah. **Peringatan:** hash ini juga bergantung ke setting compiler (`optimizer`, `bytecode_hash` di `foundry.toml`) — deploy script wajib pakai profile yang sama dengan yang dipakai buat generate hash ini, kalau nggak `pairFor()` bakal ngitung alamat yang salah walau test lokal tetap hijau (karena test dan constant di-compile bareng dalam satu run compiler yang sama).

Trust assumption: `getReserves()`/`pairFor()` nggak ngecek pair-nya udah pernah dibuat via Factory — kalau belum ada, `getReserves()` manggil alamat tanpa kode dan revert. `NirmalaRouter.sol` (belum ditulis) wajib mastiin `createPair()` dipanggil dulu.

## test/NirmalaLibraryTest.t.sol

- Harness (`NirmalaLibraryHarness`) — wrapper `external` di sekitar tiap fungsi `internal` library, pola sama `NirmalaPairHarness`, supaya `vm.expectRevert` bisa nangkep revert dari fungsi `internal`.
- Integrasi nyata: `getAmountOut`/`getAmountIn` yang dihitung library diverifikasi cocok dengan swap beneran di `NirmalaPair` (jumlah persis sukses, +1/-1 revert `NirmalaPair__K`) — bukan cuma dites terhadap rumus yang sama diketik ulang.
- **Bug ditemukan di fuzz test (di test, bukan kontrak):** `testFuzz_getAmountIn_roundTripCoversRequestedOutput` awalnya bound `amountOut` sampai `reserveOut - 1` (batas maksimum yang diizinkan `getAmountIn`). Kombinasi `reserveIn` besar + `amountOut` sangat dekat ke `reserveOut` (penyebut `(reserveOut - amountOut) * 997` jadi nyaris nol) bikin `getAmountIn` balikin `amountIn` yang sangat besar (matematis valid — makin dekat ke drain 100% pool, makin butuh amountIn tak terhingga) yang lalu overflow saat dimasukin lagi ke `getAmountOut` (`amountInWithFee * reserveOut`). Solidity 0.8.x otomatis revert (bukan silent wrap), jadi ini bukan vulnerability — cuma properti round-trip yang nggak realistis buat trade sebesar itu (slippage-nya udah tak terhingga secara ekonomi). Fix: `amountOut` dibatasi maksimum `reserveOut / 2` di fuzz test tersebut. Diverifikasi fix dengan re-run seed yang gagal, lalu full suite 3× di `--fuzz-runs 1000`.

## test/NirmalaPairTest.t.sol

- Real bug found via fuzzing (in the test, not the contract): `testFuzz_burn_matchesManualCalculation`'s `vm.assume` filter divided by `liquidity` (the LP amount minted to the user, i.e. `totalSupply - MINIMUM_LIQUIDITY`) instead of `pair.totalSupply()` (what `burn()` itself divides by). For a tiny `burnFraction` and unequal `amount0`/`amount1`, this let through cases where the *real* formula's smaller-reserve side floors to 0 — a correct `NirmalaPair__InsufficientLiquidityBurned` revert that the test wasn't expecting. Fixed by reading `reserve0`/`reserve1`/`totalSupply()` first and using those (matching exactly what `burn()` computes) in the `vm.assume` check instead of the mint-time `amount0`/`amount1`/`liquidity`. Verified fixed by re-running the exact failing seed (`--fuzz-seed 0xdd772f...`) and then the full suite 3× at `--fuzz-runs 1000`.
- `MockERC20` (`test/mocks/MockERC20.sol`) and `MockNirmalaCallee` (`test/mocks/MockNirmalaCallee.sol`) are test-only doubles — a thin mintable OZ `ERC20` standing in for token0/token1, and a minimal `INirmalaCallee` implementation whose `data` payload (`abi.decode`d as `(token0, token1, repay0, repay1)`) lets tests control exactly how much a flash-swap borrower repays, to hit both the success and `NirmalaPair__K()` revert paths.
- All tests that call `mint`/`burn`/`swap` simulate the Router-side "transfer tokens to the pair, then call the function" pattern directly in the test body (no Router exists yet) — e.g. `token0.mint(address(this), amountIn); token0.transfer(address(pair), amountIn); pair.swap(...)`.

## Session state (stopped here — resume point)

As of this session: `NirmalaToken.sol`, `UQ112x112.sol`, `INirmalaCallee.sol`, `NirmalaPair.sol`, `NirmalaFactory.sol`, and `NirmalaLibrary.sol` are fully implemented and tested. 108 tests total, all passing (`forge test --fuzz-runs 1000` ×3 clean), `forge fmt --check` clean, `forge coverage` 100% lines/statements/branches/funcs on `NirmalaLibrary.sol` (99.50%/98.21% overall statements/branches — gap is one untested branch in the test-only `MockNirmalaCallee`, not production code). Slither not installed in this environment — static analysis not run, not assumed clean.

Not started yet: `NirmalaRouter.sol`. Still open in `PRD.md`: final chain (BNB testnet vs Base Sepolia) + matching `evm_version`, and whether fee-on-transfer tokens are supported.

Natural next step: `NirmalaRouter.sol` — `addLiquidity`/`removeLiquidity`/`swapExactTokensForTokens` etc., wired to `NirmalaFactory` + `NirmalaLibrary`.
