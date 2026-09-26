# Development Notes

Rationale and design notes that don't belong as inline comments in the contracts. Organized by file.

## NirmalaRouter.sol (bagian liquidity)

`addLiquidity`, `addLiquidityETH`, `removeLiquidity`, `removeLiquidityETH`, `removeLiquidityWithPermit`, `removeLiquidityETHWithPermit`. Bagian swap dikerjakan sesi berikutnya. Sesuai PRD bagian 11.

Deviasi dari reference (`UniswapV2Router02.sol`), semua disengaja:
- **Slippage protection (`amountAMin`/`amountBMin`/dst.) ditambahkan di semua fungsi** — draft plan awal user nggak nyebut ini; ditemukan & dikoreksi sebelum implementasi (lihat diskusi plan mode).
- **`removeLiquidity` bersifat `public`**, dipanggil langsung dari `removeLiquidityETH` dengan `to = address(this)`. `msg.sender` tetap user asli di internal call.
- **Permit dibungkus `try/catch`** (`_permit()`) — kalau signature permit "dipakai duluan" oleh pihak lain di mempool (siapapun bisa nyubmit signature yang sama, itu data publik), Router cek allowance yang udah ada dulu sebelum lanjut, bukan langsung revert. **Diverifikasi lewat test** (`test_removeLiquidityWithPermit_succeedsEvenIfPermitFrontRun`) yang secara eksplisit manggil `pair.permit()` duluan dengan signature yang sama sebelum manggil Router, dan tx Router tetap sukses.
- **Kirim ETH pakai OZ `Address.sendValue`**, bukan `.transfer()`/`.call` manual — revert otomatis kalau gagal.
- **`IWETH.transfer()` return value dicek eksplisit** (`NirmalaRouter__WETHTransferFailed`) — WETH kanonik asli (bukan OZ-style) `return false` alih-alih revert kalau gagal, beda dari kebanyakan ERC20 modern. Mock test (`WETH9.sol`, OZ-based) nggak pernah menghasilkan `false` secara alami, jadi dibikin mock kedua khusus (`test/mocks/FalseTransferWETH.sol`) buat nge-test branch ini.
- **Tidak ada `nonReentrant`** — Router nggak nyimpen state apapun; dana cuma transit dalam 1 transaksi. Kontrak yang custody dana (`NirmalaPair`) udah `nonReentrant`.
- **Tidak ada event di Router** — `NirmalaPair` udah emit `Mint`/`Burn`/`Sync`, event Router cuma duplikat data yang sama.

**Stack too deep** (`optimizer = false`, `via_ir = false` di `foundry.toml`, tidak diubah): `addLiquidity` awalnya kena `Stack too deep` karena 8 parameter + 3 return value + 1 local udah kepenuhan buat legacy codegen. Fix: bagian transfer+mint dipisah ke helper internal `_settleLiquidity()`, pola sama scoping block yang udah dipakai di `NirmalaPair.swap()`. Fungsi lain (`addLiquidityETH`, `removeLiquidityETH`, dua varian permit — yang terakhir ini py 11 parameter) ternyata kompail lolos tanpa perlu pemecahan serupa.

**Coverage — 1 branch nggak kehitung, dan itu bukan gap test:** `forge coverage` nunjuk `ensure` modifier (baris `require(deadline >= block.timestamp, ...)`) cuma 1 dari 2 branch yang "ke-instrument" (nilai `-`/kosong di data mentah `lcov`, bukan `0` — beda dari gap asli yang nilainya `0` vs `N`). Ini keterbatasan `forge coverage` dalam attribute branch buat modifier yang dipakai di banyak fungsi sekaligus (`ensure` dipakai di 4 fungsi), bukan cuma di 1 fungsi kayak `require` biasa di `NirmalaPair.sol`/`NirmalaFactory.sol`. Revert path-nya **beneran ketes** (`test_addLiquidity_revertsIfDeadlineExpired`, pakai `vm.expectRevert`, lolos) — cuma reporting coverage-nya yang nggak akurat buat kasus modifier. Dua gap asli yang ketemu udah ditutup: `NirmalaRouter__WETHTransferFailed` (test pakai `FalseTransferWETH` mock) dan cek `amountBMin` di `removeLiquidity` (test awal cuma nutupin sisi `amountAMin`).

Trust assumption: Router nggak ngecek ulang bahwa alamat hasil `NirmalaLibrary.pairFor()` itu beneran `NirmalaPair` yang valid — sama kayak Uniswap V2 Router, karena alamatnya deterministik dari `factory` + init code hash yang immutable/constant.

## NirmalaRouter.sol (bagian swap)

`_swap`, `swapExactTokensForTokens`, `swapTokensForExactTokens`, `swapExactETHForTokens`, `swapTokensForExactETH`, `swapExactTokensForETH`, `swapETHForExactTokens`, plus 5 view helper (`quote`, `getAmountOut`, `getAmountIn`, `getAmountsOut`, `getAmountsIn`). Sesuai PRD bagian 12. Fee-on-transfer sengaja tidak didukung (dikunci di PRD, dibahas via diskusi sebelum implementasi) — token fee-on-transfer revert bersih lewat `NirmalaPair__K` kalau di-swap lewat fungsi biasa, bukan fund-loss.

Deviasi dari reference (`UniswapV2Router02.sol`), semua disengaja:
- **`_swap` internal di Router**, bukan di `NirmalaLibrary` — perlu external call ke `NirmalaPair.swap()`, sedangkan library tetap murni `pure`/`view`.
- **View helper (`quote`/`getAmountOut`/`getAmountIn`/`getAmountsOut`/`getAmountsIn`) baru ditambah di Router** — bukan bagian dari draft plan awal user, ditambah karena `NirmalaLibrary`-nya `internal` (nggak bisa dipanggil langsung dari luar kontrak) dan frontend butuh estimasi harga sebelum user sign tx. Cuma delegasi tipis, tanpa logic baru.
- **Urutan cek di 4 fungsi ETH**: `getAmountsOut`/`getAmountsIn` dipanggil DULU (baru itu yang validasi `path.length >= 2` via `NirmalaLibrary__InvalidPath`), baru cek `path[0]`/`path[last] == WETH` — supaya path kosong/pendek dapet revert yang jelas duluan, bukan panic index-out-of-bounds pas baca `path[0]`.
- **Swap nggak auto-`createPair()`** — beda dari `addLiquidity`/`addLiquidityETH`. Kalau pair di tengah `path` belum ada, `getReserves()` manggil alamat tanpa kode dan revert (generic, nggak ada custom error khusus) sebelum transfer apapun terjadi.

Test (`test/NirmalaRouterTest.t.sol`): 49 test bagian swap (dari 21 sebelumnya) — happy path tiap 6 fungsi dicek terhadap nilai persis `getAmountsOut`/`getAmountsIn` (bukan `> 0`), multi-hop A→B→C dicek saldo Router tetap 0 di antara hop, tiap revert path (`amountOutMin`/`amountInMax`/deadline/path WETH salah/pair belum ada/WETH transfer false) dites masing-masing per fungsi (bukan cuma 1 fungsi contoh), 2 fuzz test (`neverBelowMinAndRouterHoldsNothing`, `neverExceedsMaxAndRouterHoldsNothing`), dan 5 test kesamaan hasil Router-vs-`NirmalaLibrary` buat view helper.

**Coverage — sempat ada 5 branch asli belum ketes, ditemukan lewat `forge coverage`, bukan cuma modifier limitation:** setelah nulis versi pertama test suite, branch coverage `NirmalaRouter.sol` cuma 87.76% (43/49). Ditelusuri lewat `forge coverage --report lcov` (`BRDA` line-by-line, cari yang hit count 0) — 5 dari 6 gap itu REVERT PATH ASLI yang belum ketes: `amountOutMin` di `swapExactETHForTokens`/`swapExactTokensForETH`, `amountInMax` di `swapTokensForExactETH`, path-validation `WETH` di `swapETHForExactTokens`, dan cabang `WETH.transfer` return `false` khusus di `swapETHForExactTokens` (beda fungsi dari yang udah ketes di `swapExactETHForTokens`). Ditambah 5 test buat nutup masing-masing, branch naik ke 97.96% (48/49). 1 gap tersisa (`ensure` modifier, baris `require(deadline >= block.timestamp, ...)`) adalah limitasi `forge coverage` yang sama kayak yang udah dicatat di bagian liquidity — sekarang dipakai di 10 fungsi (bukan 4), revert path-nya udah ketes beneran (`test_swapExactTokensForTokens_revertsIfDeadlineExpired` dkk., pakai `vm.expectRevert`, lolos).

Trust assumption: sama seperti bagian liquidity — Router nggak ngecek ulang alamat hasil `NirmalaLibrary.pairFor()` itu beneran `NirmalaPair` valid.

## test/NirmalaRouterTest.t.sol

- `_signPermit()` helper bikin digest EIP-2612 manual (`PERMIT_TYPEHASH` di-hardcode dari spec, karena OZ `ERC20Permit` nggak expose typehash-nya publicly) — pola standar `vm.sign` + `DOMAIN_SEPARATOR()` + `nonces()`.
- Semua test angka (bukan cuma revert path) diverifikasi terhadap real math (proporsi `quote`, `(liquidity * balance) / totalSupply` buat `burn`), bukan cuma dicek `> 0` — biar ketauan kalau ada kesalahan urutan A/B atau off-by-one.
- `FalseTransferWETH` (`test/mocks/FalseTransferWETH.sol`) — test double yang `transfer()`-nya `return false` (bukan revert), buat nge-test defensive check `IWETH.transfer()` return value di `addLiquidityETH` dan (sesi ini) di `swapExactETHForTokens`/`swapETHForExactTokens`. Karena `transfer()`-nya cuma stub (nggak beneran mindahin saldo), pool tokenA/`badWeth` di test swap di-seed manual (`factory.createPair` + mint token langsung ke pair + cheat `deal()` buat saldo WETH palsu + `sync()`), bukan lewat `addLiquidityETH` yang pasti revert duluan kalau pakai `badWeth`.

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

As of this session: `NirmalaRouter.sol` sekarang lengkap — liquidity (sesi sebelumnya) + swap (`_swap`, 6 fungsi `swapExact.../swap...Exact...`, 5 view helper delegasi ke `NirmalaLibrary`). PRD bagian 12 ditulis & disetujui user sebelum implementasi (alur "PRD dulu, baru code"), fee-on-transfer dikunci **tidak didukung**.

157 test total (49 di `NirmalaRouterTest`, naik dari 129/21 sesi sebelumnya), semua lolos (`forge test --fuzz-runs 1000` ×3 clean), `forge fmt --check` clean, `forge coverage` pada `NirmalaRouter.sol`: 100% lines/statements/funcs, 97.96% (48/49) branches — 1 gap tersisa (modifier `ensure`) adalah limitasi instrumentasi `forge coverage`, bukan gap asli (lihat bagian `NirmalaRouter.sol (bagian swap)` di atas untuk cerita lengkap 5 gap asli yang sempat ketemu & ditutup). Slither belum terinstall di environment ini — static analysis belum dijalankan, tidak diasumsikan bersih.

Seluruh scope `NirmalaRouter.sol` dari PRD (bagian 11 + 12) sudah selesai. Yang masih terbuka: chain target final (BNB testnet vs Base Sepolia) + `evm_version`, `HelperConfig.s.sol`/`DeployNirmala.s.sol` (belum ditulis), dan frontend (belum dimulai sama sekali).

Still open in `PRD.md`: final chain (BNB testnet vs Base Sepolia) + matching `evm_version`, and whether fee-on-transfer tokens are supported.

Natural next step: `NirmalaRouter.sol` swap functions (`swapExactTokensForTokens`, `swapTokensForExactTokens`, ETH variants), wired to `NirmalaLibrary.getAmountsOut/getAmountsIn`.
