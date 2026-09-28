# Frontend ↔ Smart Contract Wiring Roadmap

Roadmap detail — tiap Phase ditulis selengkap mungkin (file, hook, ABI, logic) biar kebayang penuh gimana `frontend/` bakal nyambung ke kontrak Nirmala yang live di BNB testnet. Eksekusi tetap satu Phase per sesi (plan-mode detail masih jalan pas mulai ngerjain, buat konfirmasi desain final/pertanyaan yang muncul pas coding) — tapi sekarang semua Phase udah kebayang dari awal, nggak nunggu ditanya "abis ini apa".

Alamat kontrak & token test: lihat `NOTE.md`. Semua signature fungsi di bawah dikutip persis dari `smart-contract/src/NirmalaRouter.sol`/`NirmalaPair.sol` — bukan ditebak.

## Status sekarang (udah selesai)

- Wallet connect (`ConnectWalletModal`), account dropdown, wrong-network detection (`useCorrectNetwork`)
- Tabel pool `/liquidity` — read-only real data (`hooks/use-pools.ts`: `allPairsLength`→`allPairs`→`getReserves`+`token0`+`token1`→`symbol`), logo asli (`TokenIcon`)
- Add Liquidity `/liquidity/new` — bebas pilih 2 dari 4 aset (BNB/NTT/RST/GST) lewat `AssetSelectModal`, dual-approve kalau 2 sisi ERC20, real tx (`addLiquidity`/`addLiquidityETH`), toast tiap tahap
- **Phase 1 — SELESAI**: Swap `/trade` (semua 6 fungsi: `swapExactTokensForTokens`/`swapTokensForExactTokens`/`swapExactETHForTokens`/`swapTokensForExactETH`/`swapExactTokensForETH`/`swapETHForExactTokens`), quote real-time (`getAmountsOut`/`getAmountsIn`), price impact dari reserve pair asli (`usePairReserves`), Settings slippage/deadline user-selectable (`useSettings`, `SettingsModal`, tombol gear Navbar & trade page dipakein). `TokenSelectModal` diganti `AssetSelectModal` di `/trade`; `lib/contracts.ts` jadi 1 sumber `ASSETS`/`Asset` (dipakai `/trade` & `/liquidity/new`). `npm run build`+`npm run lint` bersih (0 issue baru).
- **Popup review→sending→success (Swap/Add/Remove) — SELESAI, di luar rencana awal**: `TxFlowModal`/`TxFlowAnimation`/`AssetAmountRow` (shared), `useTransaction` (`useMutation`-based, gantiin pola `useEffect` toast lama). Approve & aksi final (Swap/Supply/Remove) buka popup dulu, bukan langsung kirim tx. Detail lengkap di `NOTE.md`.
- **Phase 1b — SELESAI**: live quote preview Add Liquidity (`Router.quote()`, `hooks/use-add-liquidity.ts`).
- **Phase 2 — SELESAI**: Remove Liquidity + permit (`hooks/use-remove-liquidity.ts`, `use-pair-position.ts`), `/liquidity/[pair]` pakai alamat pair asli (`lib/pairs.ts` mock udah dihapus), tab Add di-embed langsung (bukan link keluar).
- `hooks/use-correct-network.ts`, `hooks/use-pair-reserves.ts`, `hooks/use-pair-position.ts`, `hooks/use-asset-balance.ts`, `hooks/use-settings.tsx`, `hooks/use-allowance.ts`, `hooks/use-transaction.ts`, `components/shared/` (`ConnectWalletModal`, `AssetSelectModal`, `SettingsModal`, `TxActionButton`, `TxFlowModal`, `TxFlowAnimation`, `AssetAmountRow`), `lib/contracts.ts` (address + ABI + `ASSETS`), `lib/wagmi.ts` — infra yang bisa DI-REUSE tiap Phase di bawah

---

## ~~Phase 1~~ — Swap (6 fungsi) + Slippage/Deadline Settings — ✅ SELESAI

### Kenapa digabung
Swap TIDAK BOLEH tanpa slippage protection (beda dari first-deposit Add Liquidity yang aman pakai 0) — setiap swap punya risiko sandwich/price-move antara sign & eksekusi. Jadi settings dikerjain BARENGAN, bukan swap dulu baru slippage nyusul.

### 1a. Extend `lib/contracts.ts`
Tambah ke `routerAbi` (relokasi `ASSETS`/`TEST_TOKENS`/`NATIVE_BNB` ke sini juga, biar `/trade` DAN `/liquidity/new` share 1 sumber, bukan duplikat definisi):
```solidity
function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) external returns (uint256[] memory amounts)
function swapTokensForExactTokens(uint256 amountOut, uint256 amountInMax, address[] calldata path, address to, uint256 deadline) external returns (uint256[] memory amounts)
function swapExactETHForTokens(uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) external payable returns (uint256[] memory amounts)
function swapTokensForExactETH(uint256 amountOut, uint256 amountInMax, address[] calldata path, address to, uint256 deadline) external returns (uint256[] memory amounts)
function swapExactTokensForETH(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) external returns (uint256[] memory amounts)
function swapETHForExactTokens(uint256 amountOut, address[] calldata path, address to, uint256 deadline) external payable returns (uint256[] memory amounts)
function getAmountsOut(uint256 amountIn, address[] calldata path) external view returns (uint256[] memory amounts)
function getAmountsIn(uint256 amountOut, address[] calldata path) external view returns (uint256[] memory amounts)
```
`quote`/`getAmountOut`/`getAmountIn` (single-hop) ditambah juga tapi dipakai di **Phase 1b**, bukan di sini.

### 1b. File baru — `hooks/use-settings.ts` + Context
Slippage & deadline itu shared preference (dipakai Swap DAN nanti retrofit ke Add-Liquidity-ke-pool-existing), jadi Context, bukan state lokal per halaman:
```ts
interface Settings { slippageBps: number; deadlineMinutes: number }
// default: slippageBps = 50 (0.5%), deadlineMinutes = 20
// persist ke localStorage (preferensi per-viewer, bukan data kritis)
```
`SettingsProvider` didaftarin di `app/providers.tsx` (sejajar `WagmiProvider`/`QueryClientProvider` yang udah ada). `useSettings()` dipanggil di halaman manapun yang butuh.

### 1c. File baru — `components/SettingsModal.tsx`
Reuse Dialog/Drawer responsive (pola sama `AssetSelectModal`/`ConnectWalletModal`). Isi: preset tombol slippage (0.1% / 0.5% / 1% / custom input), input deadline (menit). Trigger: **tombol gear yang UDAH ADA di `Navbar.tsx`** — ganti `onClick={() => setIsHowItWorksOpen(true)}` jadi buka modal ini, hapus state `isHowItWorksOpen` & reference `HowItWorksModal` yang di-comment (dead code, sumber lint warning yang nongol terus dari awal).

### 1d. Rewrite `app/trade/page.tsx`
- Ganti `TokenSelectModal` (fake list) → `AssetSelectModal` (real `ASSETS`, sekarang di `lib/contracts.ts`)
- State: `sellAsset`/`buyAsset`, `sellAmount`/`buyAmount`, `activeSide` (`'sell'|'buy'`, field yang lagi diedit user — nentuin exact-in vs exact-out, **field ini udah ada di mockup**, tinggal disambung ke logic asli)
- Saldo real: `useBalance` (kalau native) / `erc20Abi.balanceOf` (kalau ERC20) buat token yang dipilih
- **Path construction**: `path[0]`/`path[last]` pakai alamat **WBNB** kalau sisi itu "BNB" (`native` cuma nentuin fungsi Router mana yang dipanggil & apakah butuh `value`, bukan isi `path`)
- **Pemilihan fungsi** (6 kombinasi, dari `isSellNative`/`isBuyNative`/`activeSide`):

| Sell | Buy | activeSide | Fungsi |
|---|---|---|---|
| ERC20 | ERC20 | sell (exact-in) | `swapExactTokensForTokens` |
| ERC20 | ERC20 | buy (exact-out) | `swapTokensForExactTokens` |
| BNB | ERC20 | sell | `swapExactETHForTokens` (payable, `value=sellAmount`) |
| BNB | ERC20 | buy | `swapETHForExactTokens` (payable, refund sisa ETH) |
| ERC20 | BNB | sell | `swapExactTokensForETH` |
| ERC20 | BNB | buy | `swapTokensForExactETH` |

- **Live quote**: tiap amount berubah, panggil `getAmountsOut`(kalau `activeSide==='sell'`)/`getAmountsIn`(kalau `'buy'`) via `useReadContract`, isi field yang SATUNYA otomatis
- **Slippage**: `amountOutMin = amountOut * (10000 - slippageBps) / 10000` (exact-in) atau `amountInMax = amountIn * (10000 + slippageBps) / 10000` (exact-out), dari `useSettings()`
- **Deadline**: `Math.floor(Date.now()/1000) + deadlineMinutes*60` dari `useSettings()`, bukan hardcode 20
- **Price impact**: baca reserve pair langsung (`factory.getPair` → `pair.getReserves`), spot price = `reserveOut/reserveIn`, bandingin ke execution price (`amountOut/amountIn`) → gantiin angka "0.00%" hardcode di mockup
- **Approve flow**: reuse pola persis `liquidity/new` (cek `allowance`, tombol "Approve {symbol}" kalau sell token ERC20 & allowance kurang)
- Toast: reuse pola `loading→success/error` dengan `id` yang udah ada
- **Auto Router accordion**: disederhanain/dihapus (keputusan di UI Audit) — cuma single-hop buat sekarang, path selalu 2 elemen

---

## ~~Phase 1b~~ — Live quote preview di Add Liquidity — ✅ SELESAI

Kecil, nempel ke `/liquidity/new/page.tsx` yang udah ada. Pakai `Router.quote()` yang belum kepake sejauh ini.

**Realisasi (deviasi dari rencana di bawah, lihat `NOTE.md` bagian "Frontend — Swap UX modals + Phase 1b + Phase 2" buat detail lengkap):** logic diangkat ke `hooks/use-add-liquidity.ts` (bukan ditulis langsung di page), dan Add Liquidity ke pool existing sekarang juga lewat popup review→sending→success (sama pola sama Swap `/trade`) — awalnya nggak direncanain di sini, diminta user pas ngerjain modal buat Swap.

- Hook baru `hooks/use-pair-reserves.ts`: `usePairReserves(tokenA, tokenB)` → baca `factory.getPair` lalu `pair.getReserves` (mirip logic `use-pools.ts` tapi buat 1 pasangan spesifik, bisa aja hasilnya "pair belum exist")
- Kalau pair UDAH ADA reserve: tampilin teks "Current price: 1 {A} = {reserveB/reserveA} {B}" di antara 2 `TokenAmountCard`, dan pas user ngetik `amountA`, **otomatis isi `amountB`** pakai `quote(amountA, reserveA, reserveB)` (baru bisa di-edit manual kalau user emang mau override — sama kayak behavior Uniswap asli)
- Kalau pair BELUM ada (reserve 0/0): behavior tetap kayak sekarang, user bebas isi rasio berapa aja (itu yang nentuin harga awal)
- Ini yang bakal nyegah kejadian bingung "kok cuma kepake dikit" kayak insiden RST kemarin — user LANGSUNG liat harga berlaku sebelum submit, bukan ketauan pas udah ke-mine

---

## ~~Phase 2~~ — Remove Liquidity (+ varian permit) — ✅ SELESAI

**Realisasi (deviasi dari rencana di bawah, lihat `NOTE.md` untuk detail lengkap):**
- Tab "Add" (2b) **BUKAN** link ke `/liquidity/new` — di-embed langsung (`AddLiquidityForm` dikunci ke token pair itu, dropdown disembunyikan). Diubah setelah user nggak suka "dilempar" ke halaman lain.
- Remove Liquidity juga dapet popup review→sending→success (sama pola Swap), bukan cuma toast — nggak direncanain awalnya, diminta user bareng Phase 1b.
- 2 bug ketemu & dibenerin pas testing manual: `removePercent` sempat ke-reset ke 0 pas modal dibuka (bukan cuma pas ditutup), dan `parseSignature`'s `v` field bisa `undefined` di sebagian wallet.

### 2a. Route & data real
- `app/liquidity/page.tsx`: baris tabel jadi clickable lagi → `<Link href={`/liquidity/${pool.address}`}>`
- `app/liquidity/[pair]/page.tsx`: param sekarang **alamat pair asli** (bukan slug `getPairBySlug` dari `lib/pairs.ts` yang mock)
- `PairLiquidityView.tsx`: rewrite total, terima `pairAddress` sebagai prop. Baca:
  - `pairAbi.getReserves`/`token0`/`token1` + `erc20Abi.symbol` (reuse persis pola `use-pools.ts`)
  - `erc20Abi.balanceOf(pairAddress, connectedAddress)` + `erc20Abi.totalSupply(pairAddress)` — LP token itu `NirmalaToken`/ERC20 biasa, `erc20Abi` dari `viem` udah cukup, **nggak perlu ABI baru**
  - Pooled amount user: `(userLpBalance * reserve0) / totalSupply` & sama buat reserve1

### 2b. Tab "Add" — disederhanain
Sesuai UI Audit: bukan duplikat logic add-liquidity di sini. Tab "Add" isinya cuma tombol "Add more liquidity" → `Link` ke `/liquidity/new` (prefill token kalau bisa lewat query param, opsional).

### 2c. Tab "Remove" — logic baru
- Slider 0–100% (UI mockup-nya UDAH ADA di `PairLiquidityView`, tinggal disambung ke data real)
- `receiveA/B = pooledA/B * (percent/100)`
- Extend `routerAbi`:
```solidity
function removeLiquidity(address tokenA, address tokenB, uint256 liquidity, uint256 amountAMin, uint256 amountBMin, address to, uint256 deadline) external returns (uint256 amountA, uint256 amountB)
function removeLiquidityETH(address token, uint256 liquidity, uint256 amountTokenMin, uint256 amountETHMin, address to, uint256 deadline) external returns (uint256 amountToken, uint256 amountETH)
function removeLiquidityWithPermit(address tokenA, address tokenB, uint256 liquidity, uint256 amountAMin, uint256 amountBMin, address to, uint256 deadline, bool approveMax, uint8 v, bytes32 r, bytes32 s) external returns (uint256 amountA, uint256 amountB)
function removeLiquidityETHWithPermit(address token, uint256 liquidity, uint256 amountTokenMin, uint256 amountETHMin, address to, uint256 deadline, bool approveMax, uint8 v, bytes32 r, bytes32 s) external returns (uint256 amountToken, uint256 amountETH)
```
- **Jalur UTAMA: permit (1 signature, bukan approve+remove 2 tx)**:
  1. `useSignTypedData` (wagmi) — domain `{ name: "Nirmala LP", version: "1", chainId, verifyingContract: pairAddress }`, message `{ owner, spender: ROUTER_ADDRESS, value: liquidity, nonce, deadline }` — `nonce` dibaca dari `pair.nonces(owner)` (fungsi EIP-2612 standar, bukan di `erc20Abi` dasar `viem` — perlu ABI kecil tambahan: `nonces(address)(uint256)`)
  2. User sign 1x di wallet (gratis, bukan transaksi) → dapet `v,r,s`
  3. Panggil `removeLiquidityWithPermit`/`removeLiquidityETHWithPermit` langsung (1 transaksi aja)
  4. **Fallback**: kalau sign permit gagal/di-reject, jatuh ke jalur klasik (approve LP token dulu via `erc20Abi.approve`, baru `removeLiquidity`/`removeLiquidityETH`) — sama persis semangat `try/catch` yang udah didesain di kontrak Router (`_permit()`)
- Pilih varian ETH vs non-ETH: cek `token0`/`token1` ada yang `=== WBNB_ADDRESS`

---

## ~~Phase 3~~ — "Your position" indicator di tabel pool — ✅ SELESAI

**Realisasi (deviasi dari rencana di atas):**
- LP balance query **dipisah jadi tahap 5 sendiri**, bukan digabung ke multicall tahap 3 — supaya stride slicing (`i * 3`) tahap 3 tetap fix, nggak jadi kondisional ke `isConnected`. `enabled: Boolean(address) && addresses.length > 0`, jadi nggak ada RPC call tambahan kalau wallet belum connect. Nggak masuk `isLoading` yang di-return — tabel tetap render begitu data pool siap, badge nongol nyusul begitu balance read selesai.
- Badge-nya ada di **`components/liquidity/PoolTable.tsx`** (bukan `app/liquidity/page.tsx` — baris tabel emang di situ, halaman cuma nge-render `<PoolTable />`), nempel di sebelah `{symbol0}/{symbol1}`.

---

## ~~Phase 4~~ — Custom token input — ✅ SELESAI (logo CoinGecko: lookup by-symbol, bukan by-address)

**Realisasi (deviasi dari rencana di atas, keputusan dikonfirmasi user sebelum implementasi):**
- **Token non-18-desimal DITOLAK** — seluruh frontend hardcode 18 desimal (`safeParseEther`, `formatUnits(x, 18)` di `use-swap.ts`/`use-add-liquidity.ts`/`PoolTable.tsx`, `use-asset-balance.ts`). Token 6-desimal misalnya bakal bikin approve/swap/add pakai jumlah yang salah — bukan sekadar bug UI, tapi fund-loss risk. Support semua desimal butuh refactor terpisah, di luar scope Phase 4.
- **Logo CoinGecko lookup-by-**contract-address** DI-SKIP total** — endpoint `coins/binance-smart-chain/contract/{address}` itu platform mainnet, token BSC testnet nyaris pasti nggak ke-listing (selalu 404). Nggak ada route yang cocokin ke alamat kontrak. **Tapi ada susulan** (diminta user setelah nyoba import & nggak ada logo): `app/api/token-logo/route.ts` — cocokin lewat `/search?query=<simbol>` CoinGecko (text-search ke nama/simbol, bukan verifikasi kontrak), jadi token bersimbol "USDT"/"DAI" dkk. tetep dapet logo asli walau kontrak testnet-nya sendiri nggak ada hubungan ke koin itu. Detail lengkap di `NOTE.md` bagian "logo token import via CoinGecko `/search`". Token yang nggak ketemu match tetep fallback avatar huruf pertama seperti biasa.
- **Import disimpan localStorage** (`hooks/use-imported-tokens.tsx`, pola sama `use-settings.tsx` tapi lazy `useState` initializer, bukan `useEffect`+`setState` — biar list-nya siap di render client pertama, dan nggak nambah error lint `react-hooks/set-state-in-effect` baru).
- **Validasi impor**: `symbol()`+`name()`+`decimals()` on-chain (`useReadContracts`, `enabled` cuma kalau `isAddress()` valid). Ditolak kalau: alamat udah dikenal (ASSETS/imported/WBNB), read gagal (bukan ERC20), `decimals !== 18`, atau symbol-nya udah kepakai (cegah token palsu ngaku-ngaku jadi RST/GST asli). Import selalu manual (klik tombol Import), ada warning "anyone can create a token with any name".
- **Input paste-alamat ada di `AssetSelectModal.tsx`** (bukan komponen baru) — jadi otomatis kepakai di Swap & Add Liquidity sekaligus, nggak perlu ubah caller (`TokenInputCard`/`TokenAmountCard`).
- **Bug tersembunyi yang ketauan & dibenerin bareng**: `PairLiquidityView.tsx` (halaman `/liquidity/[pair]`) sebelumnya bakal *silently* fallback ke BNB/RST kalau salah satu token pair nggak dikenal (`resolveAssetFromAddress` di `use-add-liquidity.ts` balik ke `fallback` kalau nggak ketemu) — tab Add jadi ngasih liquidity ke pool yang SALAH tanpa pemberitahuan. Sekarang di-guard: kalau token pair belum di-import, tab Add nampilin pesan "import dulu" alih-alih render form yang salah target. Tab Remove nggak kena (dipanggil dari `pairAddress`, bukan `Asset`).

---

## Phase 5 — skim/sync utility (DIKONFIRMASI dikerjain, bukan opsional lagi)

- **Bagian dari halaman `[pair]` (Phase 2)** — section "Advanced" kecil (collapsed by default) di bawah tab Add/Remove di `PairLiquidityView.tsx`, bukan halaman terpisah. Alamat pair udah ada dari context halaman itu, nggak perlu input manual.
- 2 tombol: **"Sync reserves"** (`pair.sync()`) dan **"Skim excess to my wallet"** (`pair.skim(connectedAddress)`) — permissionless, 1 tx langsung tiap tombol, nggak ada approve sama sekali (beda dari Add/Remove Liquidity)
- Extend `pairAbi` di `lib/contracts.ts`: tambah `sync()` dan `skim(address)`
- Toast pattern yang sama (loading→success/error)
- **Dependency: Phase 5 baru bisa jalan SETELAH Phase 2 selesai** (karena numpang di halaman yang sama) — bukan urutan independen

---

## UI Audit — perlu keputusan kamu (bukan dihapus diam-diam)

1. ~~`PairLiquidityView.tsx` + `app/liquidity/[pair]/page.tsx`~~ — **SELESAI**, dihidupin lagi di Phase 2 pakai alamat pair asli
2. ~~`lib/pairs.ts`~~ — **SELESAI, sudah dihapus** (Phase 2, nggak ada lagi yang import)
3. ~~`TokenSelectModal.tsx`~~ — **SELESAI, sudah dihapus.** Diganti `AssetSelectModal` di SEMUA tempat (Phase 1 udah ngelakuin ini buat `/trade`, tapi widget landing page (`/`) masih pakai `TokenSelectModal`+data fake sampai widget itu diaktifin beneran — lihat poin 6). Begitu poin 6 kelar, `TokenSelectModal.tsx` jadi nggak ada consumer sama sekali → dihapus.
4. ~~Tombol gear Settings `Navbar.tsx`~~ — **SELESAI**, dihidupin Phase 1 buat slippage/deadline
5. ~~Accordion "Auto Router" `/trade`~~ — **SELESAI**, disederhanain/dihapus, single-hop aja buat sekarang (Phase 1)
6. ~~Widget swap di `/`~~ — **SELESAI, diaktifin beneran** (susulan, di luar Phase 1-5): rewrite `app/page.tsx` pakai `ASSETS`/`AssetSelectModal` real (bukan `TokenSelectModal`+`TOKENS` fake lagi), hook baru `hooks/use-swap-preview.ts` buat live quote (`getAmountsOut`/`getAmountsIn` via Router — READ-ONLY, nggak pernah approve/kirim tx). Beda dari `/trade`: `buyAsset` mulai `undefined` (nunjukin tombol "Select token" kosong dulu, bukan langsung ke-default kayak `/trade`). CTA "Get started" SELALU `<Link href="/trade">` — nggak lagi ngecek `isConnected`/buka `ConnectWalletModal` di landing page (connect wallet kejadian di `/trade`/Navbar aja). Detail lengkap di `NOTE.md`.

## Keputusan yang udah di-lock

- **Slippage: user-selectable**, bukan angka tetap — preset 0.1%/0.5%/1% + custom input (default 0.5% cuma nilai awal pas pertama buka, bukan dipaksa). Udah sesuai desain Phase 1 (`SettingsModal`) dari awal.
- **Logo custom token: CoinGecko** — realisasi akhirnya beda dari draft awal di sini (`/api/token-metadata` by-address, nggak pernah dibuat karena testnet selalu 404): jadi `/api/token-logo` by-**symbol** lewat `/search` CoinGecko. Detail lengkap di `NOTE.md` bagian "logo token import via CoinGecko `/search`".
- **Phase 5 (skim/sync): dikerjain**, nempel di halaman `[pair]` (Phase 2), bukan opsional lagi.
