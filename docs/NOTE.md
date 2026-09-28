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

## HelperConfig.s.sol & DeployNirmala.s.sol

Chain testnet primer dikunci ke **BNB testnet** (chainid 97), Base Sepolia (84532) tetap disiapkan sebagai cabang kedua (belum dipakai, jaga-jaga kalau pindah chain nanti) sesuai keputusan user. Wallet deploy udah diisi 0.25 tBNB dari faucet resmi.

Alamat WETH/WBNB kanonik **diverifikasi via web search, bukan ditebak dari memori** — ini masuk ke constructor `immutable` `NirmalaRouter.WETH`, salah alamat di sini nggak ketauan lewat compiler/test lokal, cuma ketauan pas user coba wrap/unwrap native token beneran di testnet:
- **BSC testnet (97):** WBNB `0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd` — dicek silang BscScan Testnet (indexer pihak ketiga) + dokumentasi router PancakeSwap testnet (dua sumber independen, sama-sama nunjuk alamat yang sama).
- **Base Sepolia (84532):** WETH `0x4200000000000000000000000000000000000006` — predeploy standar OP-stack (sama kayak semua chain berbasis OP Stack), dicek silang BaseScan Sepolia + Chainlink CCIP docs.
- **Anvil (31337):** `HelperConfig.getOrCreateAnvilConfig()` deploy `test/mocks/WETH9.sol` on-the-fly, di-cache di `activeNetworkConfig` biar nggak deploy dobel kalau dipanggil lagi dalam run yang sama.

Deviasi/keputusan desain:
- **`HelperConfig.s.sol` (folder `script/`) import `test/mocks/WETH9.sol` (folder `test/`)** — sengaja reuse, bukan duplikat kode. Aman karena instantiate-nya digerbang di cabang `block.chainid == ANVIL_CHAIN_ID`, jadi nggak mungkin accidental ke-deploy ke chain asli — beda kasus dari kekhawatiran PRD bagian 4 (`WETH9.sol` dilarang masuk `src/` biar nggak ikut ter-deploy ke testnet/mainnet).
- **Chain nggak dikenal → revert `HelperConfig__UnsupportedChain`**, bukan diam-diam fallback ke salah satu config — biar salah `--rpc-url`/lupa set chain ketauan langsung sebagai error, bukan nyoba jalan dengan alamat WETH yang salah.
- **`DeployNirmala.run()` cuma deploy `NirmalaFactory` + `NirmalaRouter`**, nggak ada `createPair`/`addLiquidity` demo — sama kayak deploy script `UniswapV2` asli, dan sesuai keputusan eksplisit user (infra doang, bukan tanggung jawab deploy script protokol inti).
- **`.env.example` baru dibuat** (disebut di PRD bagian 3 tapi belum pernah ada) — cuma nama variabel (`BSC_TESTNET_RPC_URL`, `BASE_SEPOLIA_RPC_URL`, `BSCSCAN_API_KEY`, `BASESCAN_API_KEY`), **`PRIVATE_KEY` sengaja TIDAK dimasukkan** sebagai env var di file ini (CLAUDE.md eksplisit larang hardcode/nyimpen private key di file yang bisa ke-commit) — dipass langsung lewat `--private-key`/`--account`/`--ledger` di command line.

Test baru:
- **`test/HelperConfigTest.t.sol`** (5 test) — `vm.chainId()` buat tiap cabang (97/84532/31337/chain nggak didukung), plus 1 test `getOrCreateAnvilConfig()` dipanggil dua kali balikin alamat WETH yang sama (nggak deploy dobel).
- **`test/DeployNirmalaTest.t.sol`** (1 test) — jalanin `DeployNirmala.run()` beneran, assert `router.factory()`/`router.WETH()` ke-wire bener ke alamat yang di-deploy (nangkep kesalahan urutan constructor arg `factory`/`weth` kalau ketuker, yang lolos compile tapi salah runtime).

163 test total, semua lolos. `forge fmt --check` clean. Selain unit test, `DeployNirmala` juga udah dicoba dijalankan beneran lewat `forge script script/DeployNirmala.s.sol:DeployNirmala --rpc-url <anvil> --private-key <anvil default key #0> --broadcast` di Anvil lokal (bukan cuma dari dalam test) — sukses, ONCHAIN EXECUTION COMPLETE, `HelperConfig`→`WETH9`(mock)→`NirmalaFactory`→`NirmalaRouter` ke-deploy berurutan sesuai ekspektasi.

**Broadcast ke BNB testnet — SELESAI, live di chain 97:**
- `NirmalaFactory`: `0x38776F00e11F4903dc0eC717b87e418CD7Aa6De0`
- `NirmalaRouter`: `0x7bE8ec3CBD3c80BbF0Df4C57adF1858642953B53`
- Deployer/wallet: `0x022EdfdeD3AD2570A06d94fB05cb250eaB08b6CB` (keystore `cast wallet` bernama `bnb-deployer`, dibuat via `cast wallet import --interactive`, bukan raw private key di `.env`)
- Gas real: 7.987.533 (Factory 4.243.495 + Router 3.744.038) @ 0.1 gwei = **0.0007987533 BNB total** — nyaris identik sama estimasi dry-run Anvil sebelumnya (7.987.545), bedanya cuma dari state chain
- Diverifikasi on-chain pakai `cast call` read-only setelah deploy: `router.factory()` == alamat Factory di atas, `router.WETH()` == `BSC_TESTNET_WBNB` (`0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd`), `factory.allPairsLength()` == 0 — semua cocok
- Broadcast dijalanin user sendiri di Terminal asli (bukan lewat sesi ini) karena `cast wallet` keystore butuh password interaktif via TTY asli — command interaktif (`cast wallet import`, broadcast pakai `--account`) gagal kalau dicoba lewat relay tool (`Device not configured (os error 6)`, ENXIO — nggak ada TTY beneran)
- Transaction log tersimpan di `broadcast/DeployNirmala.s.sol/97/run-latest.json` (ke-track git, beda dari `broadcast/*/31337/` yang di-gitignore — sesuai konvensi Foundry buat nyimpen record deploy chain asli)

Belum dilakukan: verifikasi source code di BscScan testnet (`--verify`, butuh `BSCSCAN_API_KEY` yang masih kosong di `.env`).

Still open in `PRD.md`: final chain (BNB testnet vs Base Sepolia, walau BNB udah jadi target aktif) + matching `evm_version`, and whether fee-on-transfer tokens are supported.

## Token test (ERC20 dummy) untuk demo/testing di BNB testnet

Deploy manual pakai `forge create test/mocks/MockERC20.sol:MockERC20` (BUKAN lewat `DeployNirmala.s.sol` — skrip resmi tetap cuma infra Factory+Router). `mint()` di kontrak ini public/permissionless (siapa aja bisa mint ke alamat manapun tanpa batas) — sengaja, biar gampang dipakai testing tanpa perlu faucet. Semua di-mint 1.000.000 token (18 desimal) ke wallet deployer (`0x022EdfdeD3AD2570A06d94fB05cb250eaB08b6CB`), diverifikasi `balanceOf` on-chain match buat ketiganya.

| Token | Symbol | Alamat |
|---|---|---|
| ~~Nirmala Test Token~~ | ~~NTT~~ | `0x917be9722a55f18031cf1476bdBbE0fdE3bF6bC7` — **RETIRED**, user memutuskan nggak dipakai lagi. Masih ke-deploy on-chain (nggak bisa di-undeploy), tapi nggak dipakai buat testing/demo, nggak masuk `ASSETS` frontend |
| Sukuna Token | RST | `0x613cacc0f192CAdC3486a8E53CAa87416d814b9A` |
| Gojo Token | GST | `0xa768B9D0A48E7D5Be388Eb1F8739eb02a3eB3861` |

Tujuannya: jadi pasangan token buat `addLiquidityETH`/`addLiquidity` pertama di Nirmala (belum ada pair/liquidity apapun di Factory sampai sekarang — `allPairsLength() == 0`). **Bukan bagian protokol inti, jangan pernah dipakai di mainnet.** RST/GST tetap jadi 2 test token resmi user.

## Frontend — Swap UX modals + Phase 1b (live quote) + Phase 2 (Remove Liquidity)

Pola arsitektur yang udah settle di frontend (dipakai konsisten, ikuti ini buat fitur baru): tiap fitur punya 1 hook business-logic (`hooks/use-swap.ts`, `use-add-liquidity.ts`, `use-remove-liquidity.ts`) yang dipanggil dari 1 komponen presentational tipis (`SwapCard.tsx`, `AddLiquidityForm.tsx`, `PairLiquidityView.tsx`). State modal (open/close) tetap di komponen, bukan di hook — hook cuma expose data/handler/status tx. Potongan yang kepakai 2+ tempat diangkat ke `components/shared/`: `TxFlowModal` (shell Dialog/Drawer responsif, terkunci selama status `'sending'`), `TxFlowAnimation` (ikon send/check/x via framer-motion), `AssetAmountRow`, `TokenSelectButton`, `TxActionButton` (rantai Connect→Switch Network→Approve→Submit), `useTransaction` (`useMutation`-based tx+toast, gantiin pola lama `useWriteContract`+4 `useEffect`), `useAllowance`.

**Swap (`/trade`):** approve dan swap sekarang lewat popup review/status (`TxFlowModal`), bukan langsung kirim tx. Approve: sending→success/error. Swap: review (jumlah+rate+price impact+minimum setelah slippage) → Confirm → sending → success (+link BscScan) / error. Tombol final Swap jadi warna amber (`btn-accent`, class CSS baru niru struktur `.btn-color`) begitu ada amount, biar keliatan beda dari Approve (tetap biru). Ditambah cek insufficient-balance (sebelumnya nggak ada sama sekali — tombol tetap aktif walau saldo kurang). Sempat ada bug flicker: query quote butuh `placeholderData: keepPreviousData`, kalau nggak box detail-nya unmount/remount tiap keystroke.

**Add Liquidity (Phase 1b, `PLAN.md`):** `hooks/use-add-liquidity.ts` — logic diangkat keluar dari `AddLiquidityForm.tsx`. Kalau pair yang dituju udah ada reserve, ngetik 1 sisi auto-isi sisi lain lewat `Router.quote()` (on-chain, `keepPreviousData` diterapin dari awal). Kalau belum ada reserve (first-deposit), dua sisi tetap independen — rasio itu yang nentuin harga awal. Pakai pola modal review/sending/success yang sama kayak Swap, `amountAMin`/`amountBMin` dari slippage (0 kalau first-deposit). Juga dapet fix yang sama kayak Swap: label "Enter an amount", cek saldo, `deadlineMinutes` dari Settings (dulu hardcode 20 menit).

**Remove Liquidity (Phase 2):** `hooks/use-remove-liquidity.ts` + `use-pair-position.ts` (baru — baca LP balance/pooled amount buat 1 pair spesifik, beda dari `use-pair-reserves.ts` yang generic buat 2 token sembarang dipakai Swap/Add). `routerAbi` ditambah `removeLiquidity`/`removeLiquidityETH`/`removeLiquidityWithPermit`/`removeLiquidityETHWithPermit` (signature diverifikasi langsung dari `NirmalaRouter.sol`, bukan ditebak) + `pairAbi.nonces()`. Alur: tanda tangan 1x EIP-2612 permit (domain diverifikasi dari constructor `NirmalaToken` — `ERC20Permit("Nirmala LP")`) → `removeLiquidity(ETH)WithPermit` 1 tx. Kalau wallet nggak pernah ngasih tanda tangan (user reject/gagal), fallback ke approve+`removeLiquidity(ETH)` klasik (2 tx, lanjut otomatis begitu approve sukses) — kontrak sendiri (`_permit()`) udah nanganin kasus permit KE-SUBMIT tapi revert (mis. signature kepakai duluan/front-run), jadi frontend cuma perlu nangani "nggak ada tanda tangan sama sekali".

Dua bug nyata ketemu & dibenerin pas testing manual:
- `removePercent` ke-reset ke 0 pas modal DIBUKA (harusnya cuma di-reset pas modal DITUTUP setelah sukses) — akibatnya popup review selalu nunjukin "You will receive 0" dan Confirm nggak jalan (`liquidity` ikut 0). Dipisah jadi `resetTxState()` (dipanggil pas buka) vs `resetAfterSuccess()` (dipanggil pas tutup setelah sukses).
- `parseSignature`'s field `v` bisa `undefined` di sebagian wallet (format recovery-id 0/1, bukan 27/28) — dibenerin pakai `27 + yParity` yang selalu benar terlepas format wallet-nya.

**`/liquidity/[pair]`:** rewrite total, lepas dari mock `lib/pairs.ts` (udah dihapus). `pairAddress` asli, data live via `use-pair-position.ts`. Tab Add **di-embed langsung** (`AddLiquidityForm` dikunci ke token pair itu, dropdown token disembunyikan) — bukan link keluar ke `/liquidity/new` kayak rencana awal `PLAN.md`, diubah setelah user nggak suka "dilempar" ke halaman lain. `AddLiquidityForm`/`use-add-liquidity.ts` dapet prop `initialTokenAAddress`/`initialTokenBAddress` (override query-param), `TokenAmountCard` dapet prop `locked` (badge statis, bukan dropdown). `/liquidity/new` standalone tetap jalan, baca `tokenA`/`tokenB` yang sama lewat query param (dikirim link "Add more liquidity" dari halaman pair) — butuh `Suspense` boundary di sekitar `AddLiquidityForm` di manapun dipakai, karena `useSearchParams()` dipanggil unconditional di dalam hook.

### Session state (frontend, resume point)

Phase 1b dan Phase 2 (`PLAN.md`) selesai, plus lapisan modal UX yang awalnya nggak ada di scope keduanya (diminta user di tengah sesi, diterapin konsisten ke Swap/Add/Remove). `npm run build`/`npm run lint` bersih di sepanjang sesi (baseline: 4 error pre-existing di `Navbar.tsx`/`use-media-query.ts`/`use-settings.tsx`, nggak terkait, nggak ditambah sesi ini). Semua fitur ditest manual sama user langsung di browser (bukan lewat Claude in Chrome, sesuai preferensi tetapnya).

## Frontend — Phase 3 ("Your position" badge)

`hooks/use-pools.ts` dapet tahap 5: multicall `erc20Abi.balanceOf(pairAddress, connectedAddress)` per pair, `enabled: Boolean(address) && addresses.length > 0` — dipisah dari tahap 3 (reserve+token0+token1) biar stride slicing-nya (`i * 3`) tetap fix, nggak jadi kondisional ke status connect. Field baru `userLpBalance` di `OnChainPool`, default `BigInt(0)` kalau belum ke-load/belum connect. Nggak masuk `isLoading` yang di-return — tabel render duluan begitu data pool siap, badge nongol nyusul.

Badge-nya di `components/liquidity/PoolTable.tsx` (baris tabel emang di situ, bukan di `app/liquidity/page.tsx` yang cuma nge-render `<PoolTable />` — deviasi kecil dari lokasi yang disebut `PLAN.md`), muncul di sebelah `{symbol0}/{symbol1}` kalau `userLpBalance > BigInt(0)`. Style pill kecil biru (`text-blue-400`/`bg-blue-500/10`), niru aksen biru yang udah dipakai di footer text halaman `/liquidity`.

## Bug fix — quote nggak clear pas input sumbernya dikosongin (Swap + Add Liquidity)

Ditemukan user: di `/trade` dan Add Liquidity (baik `/liquidity/new` maupun tab Add di `/liquidity/[pair]`), ngetik amount di 1 sisi otomatis ngisi sisi lain lewat quote on-chain (`getAmountsOut`/`getAmountsIn`/`Router.quote()`). Tapi pas sisi sumber DIKOSONGIN lagi, sisi hasil quote-nya nggak ikut kosong — masih nunjukin angka lama.

Akar masalah: query quote (`useReadContract`) pakai `query.enabled` yang jadi `false` begitu input sumber kosong (`typedAmount` → `undefined`), TAPI `placeholderData: keepPreviousData` (dipasang dari awal buat nyegah flicker box detail pas ngetik) tetap ngasih nilai TERAKHIR yang sukses di-fetch, walau query-nya udah disabled — bukan otomatis balik `undefined`.

Fix di `hooks/use-swap.ts` (`sellDisplay`/`buyDisplay`) dan `hooks/use-add-liquidity.ts` (`amountADisplay`/`amountBDisplay`): tambah cek eksplisit, kalau `typed<Sumber>Amount === undefined` (source-nya kosong/invalid), tampilin string kosong `''` langsung — nggak peduli quote hasil `keepPreviousData` masih ada isinya. Logic submit (`parsedAmountA`/`parsedSellAmount` dkk.) nggak kena bug ini sama sekali (udah bener-bener `undefined` dari awal), murni bug display.

## Frontend — Phase 4 (custom token import)

**Keputusan dikonfirmasi user sebelum implementasi** (detail lengkap di `PLAN.md`): token non-18-desimal DITOLAK (seluruh frontend hardcode 18 desimal), lookup-by-**contract-address** CoinGecko DI-SKIP total (endpoint-nya platform mainnet, testnet selalu 404), import disimpan localStorage.

- `hooks/use-imported-tokens.tsx` (baru): Context + provider, pola sama `use-settings.tsx` tapi load-nya lewat **lazy `useState` initializer** (`useState<Asset[]>(loadFromStorage)`), BUKAN `useEffect`+`setState` — dua alasan: (1) nggak nambah error lint `react-hooks/set-state-in-effect` ke-5 (baseline sekarang 4, semuanya pre-existing, nggak disentuh), (2) list-nya harus udah siap di render client PERTAMA, karena `use-add-liquidity.ts` resolve token pair dari alamat lewat `useState` initializer juga (`resolveAssetFromAddress`) — kalau imported tokens baru keisi setelah effect jalan, resolve pertama bakal miss token yang harusnya udah dikenal.
- Storage key `nirmala-imported-tokens`, validasi tiap entry pas load (`isAddress` dkk.) — entry rusak di-drop, bukan bikin seluruh list gagal.
- Input paste-alamat ditaruh di `components/shared/AssetSelectModal.tsx` sendiri (`ImportTokenInput`, subkomponen baru di file yang sama) — otomatis kepakai di semua caller (`TokenInputCard` buat Swap, `TokenAmountCard` buat Add Liquidity) tanpa ubah caller-nya. List token yang ditampilin jadi `[...assets, ...importedTokens]` sebelum di-filter `excludeSymbol`.
- Validasi: `useReadContracts` (`erc20Abi` `symbol`/`name`/`decimals`) ke alamat yang di-paste, `enabled` cuma kalau `isAddress()` valid DAN alamatnya belum dikenal (bukan di `assets`/`importedTokens`/`WBNB_ADDRESS`). Ditolak kalau: read gagal (bukan kontrak ERC20), `decimals !== 18`, atau symbol-nya collision sama token yang udah ada (cegah token nakal ngaku-ngaku "RST"/"GST" — siapa aja bisa deploy ERC20 dengan `symbol()` apa aja). Import SELALU manual (user klik tombol Import setelah liat preview token + warning), nggak pernah auto-select pas ketik alamat.
- `hooks/use-add-liquidity.ts`: `resolveAssetFromAddress` nyari juga di `importedTokens` (parameter baru `extraAssets`), dipanggil dari `useImportedTokens()`.
- **Bug lama ketauan & dibenerin bareng, di `components/liquidity/PairLiquidityView.tsx`**: sebelum Phase 4, kalau salah satu token pair nggak ada di `ASSETS`, `resolveAssetFromAddress` bakal *silent fallback* ke `NATIVE_BNB`/`TEST_TOKENS[0]` — tab Add di halaman pair itu diem-diem nge-render form buat pool YANG SALAH (nggak keliatan dari luar karena UI-nya di-`locked` jadi nggak nunjukin dropdown token). Nggak reachable sebelum ada custom token pool, tapi begitu Phase 4 ngasih jalan bikin pool pakai token custom, ini jadi bug beneran. Fix: `PairLiquidityView` sekarang ngecek dulu `token0`/`token1` dikenal (ASSETS/imported/WBNB) sebelum render `AddLiquidityForm` — kalau nggak, tampilin pesan "import token ini dulu" alih-alih form yang salah target. Tab Remove aman dari awal (kerja dari `pairAddress`, bukan `Asset`).

## Frontend — logo token import via CoinGecko `/search` (susulan Phase 4)

User coba import USDT/DAI (alamat testnet) dan logo-nya nggak muncul — ternyata sesuai ekspektasi awal (lookup-by-contract-address di-skip, lihat section di atas), tapi user nggak suka hasilnya "gaada gambar sama sekali" dan nanya apa CoinGecko bisa dicari lewat nama/simbol aja, bukan alamat. Jawabannya: BISA — beda endpoint. `/search?query=<text>` itu text-search ke seluruh database CoinGecko (bukan match ke kontrak on-chain), jadi walau kontrak testnet-nya sendiri nggak ada relasi ke koin asli, token yang SIMBOLNYA "USDT"/"DAI" tetep ketemu logo dari situ. User setuju: **RST/GST tetep hardcode (`TOKEN_IMAGES` di `TokenIcon.tsx`, unchanged), token lain (hasil import) coba fetch dari CoinGecko `/search` by-symbol.**

- **`app/api/token-logo/route.ts`** (baru) — route handler server-side, `GET ?symbol=<simbol>`, proxy ke `https://api.coingecko.com/api/v3/search?query=<simbol>` pakai header `x-cg-demo-api-key` (key `COINGECKO_API` tetep server-only, nggak pernah nyampe browser — alasan sama kayak draft awal Phase 4 yang di-skip). Filter hasil `coins[]` yang `symbol` PERSIS sama (case-insensitive) — bukan cocok sebagian/fuzzy, biar nggak salah ambil koin yang nama/simbolnya mirip-mirip doang. Dari yang match, pilih `market_cap_rank` TERKECIL (null dianggap tak terhingga) — ngurangin risiko kepilih listing sampah/scam yang pakai simbol populer. Nggak pernah throw ke caller — network gagal/no match/apapun balikin `{ image: null }`, karena ini murni kosmetik, fallback ke avatar huruf tetep jalan sempurna tanpa ini.
- **`lib/contracts.ts`**: `Asset` dapet field opsional `logoUrl?: string` (cuma keisi buat token import, ASSETS bawaan nggak butuh). Helper baru `findLogoUrl(symbol, importedTokens)` buat tempat yang cuma punya string symbol dari on-chain read (bukan objek `Asset` lengkap) — dipakai `PoolTable.tsx`, `PairLiquidityView.tsx`, `RemoveLiquidityReviewModal.tsx` (yang terakhir nerima `logoUrl0`/`logoUrl1` sebagai prop baru dari `PairLiquidityView`, bukan lookup sendiri, biar nggak manggil `useImportedTokens()` dobel).
- **`TokenIcon.tsx`** dapet prop opsional `imageUrl` — dicoba SETELAH cek ETH/BNB hardcode dan `TOKEN_IMAGES` (RST/GST), SEBELUM fallback huruf. Ada `onError` + local state (`remoteFailed`) buat auto-fallback ke huruf kalau URL gambarnya ternyata broken/404 pas runtime (bukan cuma pas fetch API-nya). File ini jadi butuh `'use client'` (nambah `useState`) — sebelumnya nggak ada directive eksplisit, tetep kerja karena diimport dari komponen client, tapi ditambahin biar eksplisit.
- **`components/shared/AssetSelectModal.tsx`** (`ImportTokenInput`): begitu token valid (`isReady`), `useQuery` (`@tanstack/react-query`, dipanggil langsung — bukan lewat wagmi wrapper, pertama kalinya di codebase ini) manggil `/api/token-logo?symbol=...`, `staleTime: Infinity` (simbol→logo nggak berubah, sekali fetch cukup). Preview token & tombol Import pakai `logoUrl` yang ke-fetch; `onImported()` nyimpen `logoUrl` itu sebagai bagian dari `Asset` yang di-`addToken()` — jadi cuma di-fetch SEKALI pas import, bukan tiap kali icon-nya di-render ulang di tempat lain.
- Logo yang udah kesimpen ikut ke-thread ke semua tempat `TokenIcon` dipanggil pakai `Asset` lengkap (`TokenSelectButton` lewat prop baru `imageUrl`, dipakai `TokenInputCard`/`TokenAmountCard`; `AssetAmountRow` buat popup review Swap/Add/Remove) maupun yang cuma punya symbol string (`PoolTable`, header+"you will receive" di `PairLiquidityView`, `RemoveLiquidityReviewModal` via `findLogoUrl`).

**Belum dikerjakan:** Phase 5 (skim/sync — sengaja digantung nunggu Phase 2 kelar, belum diminta lagi). Nggak ada tombol "remove imported token" (nggak diminta).

## Frontend — Search pools di `/liquidity` + debounce

Diminta user: search box di sebelah tombol "Add Liquidity" di `/liquidity`, filter berdasarkan token, plus mastiin SEMUA fitur search di app (baru maupun yang udah ada) pakai debounce.

- **`hooks/use-debounced-value.ts`** (baru, reusable): `useDebouncedValue(value, delayMs = 300)`. `setState`-nya dipanggil di dalam callback `setTimeout` (async), BUKAN sinkron di body efek — jadi nggak kena lint `react-hooks/set-state-in-effect` yang udah nge-flag 4 tempat lain di codebase (itu ngelarang setState LANGSUNG di body efek; men-subscribe ke timer lalu setState di callback-nya itu justru pola yang direkomendasiin React docs sendiri). Diverifikasi: `npm run lint` tetep 4 error baseline, nggak nambah.
- **`app/liquidity/page.tsx`**: input search baru di baris yang sama sama tombol "Add Liquidity" (`flex justify-end` → `flex items-center justify-between`), state `searchInput` di-debounce lalu dioper ke `<PoolTable searchQuery={debouncedSearch} />`. Input-nya sendiri instan (nggak nunggu debounce) — yang di-debounce cuma HASIL filter-nya, biar ngetik tetep berasa responsif tapi filtering-nya nggak triggered tiap keystroke.
- **`components/liquidity/PoolTable.tsx`**: prop baru `searchQuery` (opsional, default `''`), filter `pools` (dari `usePools()`, data yang UDAH ke-fetch — filter ini murni in-memory, bukan query on-chain baru) berdasarkan `symbol0`/`symbol1` (case-insensitive, `includes`). Empty-state pesan-nya beda kalau lagi nyari ("No pools match your search.") vs kalau emang belum ada pool sama sekali ("No pools yet.").
- **`components/shared/TokenSelectModal.tsx`** (widget swap dekoratif di homepage, `app/page.tsx` — lihat `PLAN.md` UI Audit poin 6) — ternyata udah punya search box sendiri dari awal (filter `TOKENS` hardcode), tapi TANPA debounce (filter langsung tiap keystroke). Ditambahin `useDebouncedValue` di sini juga, biar konsisten "semua fitur search pakai debounce" sesuai permintaan user — walau dampak performanya minim (cuma filter array 5 item in-memory), prinsipnya tetep diterapin merata. **(Update sesi berikutnya: file ini udah dihapus total begitu homepage diaktifin beneran, lihat section di bawah — jadi debounce di sini sempat kepake tapi nggak lama.)**
- `AssetSelectModal.tsx` (token picker asli Swap/Add Liquidity) **belum punya search box sama sekali** (cuma paste-alamat buat import, beda fitur) — di luar scope permintaan ini, nggak ditambahin (nggak diminta).

## Frontend — Aktifin widget swap di `/` (landing page)

Sebelumnya widget di `/` (PLAN.md UI Audit poin 6) sengaja dekoratif — data token fake (`TOKENS` hardcode di `TokenSelectModal.tsx`), nggak ada quote beneran, CTA "Get started" cuma jalan kalau `isConnected` (kalau nggak, buka `ConnectWalletModal`). Diminta user: aktifin beneran — quote real (ngitung "atas segini, bawah segini" via Router), tapi CTA final SELALU ngarahin ke `/trade` (landing page cuma buat preview kalkulasi, bukan tempat eksekusi swap), dan beda dari `/trade`: sisi Buy HARUS mulai kosong ("Select token") pas pertama kali landing, bukan langsung ke-default kayak `/trade`.

- **`hooks/use-swap-preview.ts`** (baru) — **BUKAN** reuse `hooks/use-swap.ts` langsung, sengaja dipisah: `use-swap.ts` itu punya banyak concern yang nggak relevan di sini (approve, slippage, deadline, allowance, submit tx beneran) karena dipakai `/trade` buat eksekusi transaksi UANG BENERAN — maksa dia support `buyAsset` yang nullable/opsional cuma buat kebutuhan dekoratif landing page nambah risiko ke halaman yang paling kritis di app tanpa manfaat balik ke situ. Hook baru ini cuma nyontek pola QUOTE-nya doang (`getAmountsOut`/`getAmountsIn` via `useReadContract`, plus fix "clear on empty" yang sama kayak `use-swap.ts`/`use-add-liquidity.ts`), reuse helper yang emang generic (`resolvePathAddress` dari `lib/swap.ts`, `safeParseEther` dari `lib/format.ts`), TANPA approve/slippage/deadline/tx sama sekali. `buyAsset: Asset | undefined`, mulai `undefined`.
- **`app/page.tsx`**: rewrite — `TokenSelectModal`+`TOKENS` fake diganti `AssetSelectModal`+`ASSETS` asli (token beneran: BNB/RST/GST + hasil import user, sama kayak `/trade`), `TokenSelectButton`+`TokenIcon` buat trigger token yang UDAH kepilih (sisi Sell selalu, sisi Buy kalau udah dipilih) — visual/struktur JSX-nya dijaga SAMA PERSIS kayak desain lama (termasuk tombol "Select token" custom buat sisi Buy yang masih kosong), cuma logic-nya yang diganti dari fake state ke `useSwapPreview()` beneran.
- **CTA "Get started"**: sebelumnya kondisional (`isConnected ? <Link href="/trade"> : <ConnectWalletModal>`), sekarang **SELALU** `<Link href="/trade">`, nggak peduli status connect. Import `useAccount`/`ConnectWalletModal` yang jadi nggak kepake di file ini ikut dihapus. Connect wallet tetep bisa lewat Navbar atau di `/trade` sendiri — landing page nggak nge-gate apapun lagi.
- **Bytecode di on-chain read (`getAmountsOut`/`getAmountsIn`) jalan walau wallet belum connect** — `lib/wagmi.ts` transport-nya `http(NEXT_PUBLIC_BSC_TESTNET_RPC_URL)`, bukan bergantung ke provider wallet, jadi quote di landing page tetep jalan buat visitor yang belum connect wallet sama sekali.
- **`components/shared/TokenSelectModal.tsx` DIHAPUS** — itu satu-satunya consumer-nya (homepage), begitu diganti `AssetSelectModal`, file ini orphan total. Ini juga nutup 2 item UI Audit `PLAN.md` yang sebelumnya masih "belum diputuskan" (poin 3 dan 6) sekaligus.
- Tombol panah "swap direction" (di antara Sell/Buy card) **behaviornya TETEP SAMA kayak sebelumnya** (cuma toggle `activeSide`/fokus, BUKAN nuker `sellAsset`↔`buyAsset` kayak `handleSwapDirection` di `/trade`) — nggak diminta buat diubah, jadi dibiarin, walau ikonnya kelihatan kayak "swap direction". Kalau kamu mau itu beneran nuker token juga, bilang aja.

**Susulan kecil, sesi yang sama:** begitu `/` jadi halaman beneran (bukan cuma dekorasi doang), ketauan `Navbar.tsx` sebelumnya nge-treat `/` sebagai bagian dari tab **Trade** (`pathname === '/trade' || pathname === '/'` buat active-state-nya) — nggak ada tab "Home" terpisah. Diminta user: tambah tab "Home" sendiri (`Link href="/"`, icon `Home` dari `lucide-react`, ditaruh SEBELUM Trade di kedua nav — desktop & mobile dropdown), dan `pathname === '/'` di-hapus dari kondisi active Trade (sekarang Trade cuma aktif kalau bener-bener di `/trade`).

`npm run build`/`npm run lint` clean, tetep 4 error baseline yang sama, nggak nambah.

**Susulan kedua, sesi yang sama:** user redesign dikit tampilan `/` sendiri (layout 2 kolom kiri-kanan, di luar sesi ini — diminta bantu 2 hal soal kolom kiri):

- **Copy diganti** — sebelumnya generic template text yang FAKTANYA SALAH buat proyek ini ("Trade Crypto Instantly Across **11 Chains**" — Nirmala cuma single-chain, BNB testnet doang). H1 "Everyone's Favorite DEX." → "Swap Tokens. Zero Hassle.", subtext jadi nyebut brand + chain yang bener: "Nirmala Exchange — a fast, fully on-chain AMM live on BNB Smart Chain Testnet".
- **Row badge di bawahnya diganti total** — sebelumnya `CHAIN_ICONS` dummy (10 badge warna-warni isinya teks kode chain doang, kayak "ETH"/"BNB"/"ARB", nggak ada logo beneran). Diganti row token showcase (`SHOWCASE_SYMBOLS`: BTC/ETH/BNB/USDT/USDC/SOL/XRP/DOGE/ADA/LINK) yang logonya **di-fetch beneran** — reuse route `/api/token-logo` yang UDAH ADA dari fitur import token (lihat section "logo token import via CoinGecko `/search`" di atas), bukan bikin endpoint baru. `queryKey: ['token-logo', symbol]` sengaja SAMA persis format-nya kayak `ImportTokenInput` di `AssetSelectModal.tsx` — react-query cache-nya kepakai bareng (1 `QueryClientProvider` buat seluruh app), jadi kalau simbol yang sama pernah di-fetch di salah satu tempat, tempat lainnya dapet cache hit instan.
- **Skeleton pas loading** (diminta eksplisit user — "biar ga lemot fetchnya"): `ShowcaseTokenIcon` (komponen baru, lokal di `app/page.tsx`, single-use jadi nggak diangkat ke file terpisah) render badge bulat abu-abu `animate-pulse` selagi `isLoading`, baru diganti `TokenIcon` (component yang udah ada, reuse) begitu fetch selesai — nggak ada layout shift karena ukuran badge skeleton vs isi final SAMA.
- **Optimasi kecil**: ETH & BNB di-skip dari fetch (`enabled: false`) — `TokenIcon.tsx` emang udah hardcode logo resmi keduanya duluan sebelum sempat liat `imageUrl` prop, jadi manggil API buat 2 simbol itu bakal sia-sia, hasilnya nggak pernah kepake.
- Badge shape diganti dari `rounded-xl` (kotak-membundar, dulu didesain buat nampung TEKS) jadi `rounded-full` (bulat penuh) — biar konsisten sama container `TokenIcon` di semua tempat lain di app (`TokenSelectButton`, `AssetAmountRow`, `PoolTable`, dll — semuanya bulat), sekarang isinya foto beneran bukan teks lagi jadi bentuknya disamain.

## Multi-hop swap routing (`/trade`) — general graph pathfinding

User nanya: kalo cuma ada pair BNB/RST dan BNB/GST (nggak ada RST/GST langsung), swap RST→GST udah kepake lewat BNB apa belom? Jawabannya: **kontrak udah support dari awal** (`NirmalaRouter._swap()` loop `path: address[]` arbitrary length, `getAmountsOut`/`getAmountsIn` juga — ini emang desain PRD bagian 12 dari awal, ABI `routerAbi` di `lib/contracts.ts` juga udah `address[]` bukan tuple tetap), tapi **frontend belom** — `hooks/use-swap.ts` sebelumnya hardcode `path` selalu `[sellAsset, buyAsset]` (2 elemen doang), nggak ada pathfinding sama sekali. User diminta pilih: bridge tetap via BNB doang, atau graph pathfinding umum (lewat token APAPUN yang punya pair) — **user pilih graph umum**.

**PENTING: nggak ada perubahan smart contract sama sekali di fitur ini** — murni kerjaan frontend, karena `NirmalaRouter.sol` emang udah didesain nerima path arbitrary length dari awal.

- **`lib/routing.ts`** (baru) — pure function, nggak nyentuh wagmi/React sama sekali (gampang diverifikasi benar/nggaknya sendiri, terpisah dari sisi network):
  - `buildAdjacency(pairs)` — bangun graph undirected dari daftar semua pair (`token0`↔`token1` jadi edge dua arah).
  - `findSwapPath(from, to, graph, maxHops = 3)` — BFS biasa, balikin path TERPENDEK. `maxHops` (default 3 hop / maks 4 token) sengaja dibatasin — tiap hop tambahan nambah fee 0.3% dan price impact dari pool ITU SENDIRI, jadi rute yang kepanjangan nggak realistis buat dipake walau "secara teknis ada". BFS balikin path terpendek duluan, jadi kalau pair LANGSUNG ada (jarak 1), itu SELALU yang kepilih — ini yang jamin swap yang udah jalan sekarang (BNB↔RST, BNB↔GST) nggak pernah ke-reroute jadi lebih panjang dari yang seharusnya.
- **`hooks/use-swap-route.ts`** (baru) — `useAllPairEdges()`: versi RINGAN dari `hooks/use-pools.ts` (Factory `allPairsLength`→`allPairs`→`token0`/`token1` doang per pair, TANPA reserves/symbol/LP-balance yang cuma dibutuhin `/liquidity`). Sengaja DIPISAH dari `usePools()`, bukan reuse — biar `/liquidity` nggak kesentuh SAMA SEKALI sama fitur ini (salah satu syarat user: "jangan merusak yang udah dibuat"). `useSwapRoute(sellAsset, buyAsset)` bangun graph dari edges itu, jalanin BFS, balikin `{ path, routeExists, isMultiHop, isLoading }`.
- **`hooks/use-swap.ts`**: `path` sebelumnya `[resolvePathAddress(sellAsset), resolvePathAddress(buyAsset)]` tetap 2 elemen → sekarang hasil `useSwapRoute()`, fallback ke 2-elemen kalau route belum ketemu (biar tipe `path` nggak pernah `undefined` dipassing ke query). Perubahan turunan:
  - `getAmountsOut`/`getAmountsIn`: `enabled` ditambah `&& routeExists` — kalau emang nggak ada rute, nggak nyoba RPC call yang pasti gagal, langsung tau dari pathfinding di client.
  - Price impact (`usePairReserves(path[0], path[1])`): di-gate `!isMultiHop` doang — multi-hop butuh gabungan reserve dari SEMUA pair di path (matematikanya beda, di luar scope sekarang), `undefined` buat kasus itu. `SwapDetailRows.tsx` UDAH nge-render "—" kalau `priceImpact` undefined dari awal, jadi nggak perlu ubah apa-apa di situ buat bagian ini.
  - `routeSymbols` (baru, cuma keisi kalau `isMultiHop`) — path address di-resolve balik ke simbol buat ditampilin (`['RST','BNB','GST']`), lookup ke `[...ASSETS, ...importedTokens]` (WBNB di-map ke "BNB"), fallback `shortenAddress()` (duplikat 1-liner yang emang udah ada di 2 file lain, `AssetSelectModal.tsx`/`PairLiquidityView.tsx` — dipertahanin konsisten sama gaya repo, bukan diangkat jadi shared util) kalau hop token-nya nggak dikenal sama sekali.
  - Hook expose field baru: `routeExists`, `isMultiHop`, `isLoadingRoute`, `routeSymbols`.
- **`lib/swap.ts`**: `buildSwapRequest`'s `path` param tipenya dilonggarin dari `readonly [0x, 0x]` (tuple 2 tetap) jadi `readonly \`0x\${string}\`[]` (variable length) — MURNI perubahan tipe TS, function-nya udah dari awal cuma nerusin `path` langsung ke `args`, ABI kontrak juga udah `address[]`, jadi behavior runtime buat swap 2-hop yang udah ada IDENTIK, nggak berubah sama sekali.
- **UI transparansi rute**: `SwapDetailRows.tsx` dapet baris baru "Route" (mis. "RST → BNB → GST"), CUMA muncul kalau `routeSymbols` keisi (multi-hop) — buat swap langsung (mayoritas kasus hari ini), nggak ada perubahan visual sama sekali. Di-thread lewat `SwapDetails.tsx` (panel di card) dan `SwapReviewModal.tsx` (popup konfirmasi) — biar user liat rute-nya SEBELUM klik Confirm, penting karena tiap hop nambah fee & exposure ke pool lain.
- **UI "no route"**: `SwapCard.tsx` — pesan baru "No route available between X and Y" muncul begitu `!isLoadingRoute && !routeExists`, INDEPENDEN dari udah ngetik amount apa belom (biar ketauan langsung abis milih 2 token, bukan nunggu quote gagal dulu). Tombol Swap disabled juga di kondisi yang sama, biar nggak bisa submit tx yang pasti bakal revert.

**Nggak diubah sama sekali** (sengaja, biar risiko regresi minimal): kontrak (`NirmalaRouter.sol` dkk — emang udah support dari awal), `hooks/use-pools.ts` & halaman `/liquidity`, alur Add/Remove Liquidity. `npm run build`/`npm run lint` clean, tetep 4 error baseline yang sama, nggak nambah.

**Belum ditest manual** (perlu browser, sesuai preferensi user — bukan lewat Claude in Chrome): swap RST→GST/GST→RST (rute baru), regresi BNB↔RST/BNB↔GST (harus identik kayak sebelumnya, nggak ada baris "Route" nongol), exact-out multi-hop, dan kasus "no route" beneran kalau ada token yang bener-bener nggak nyambung ke mana-mana.

