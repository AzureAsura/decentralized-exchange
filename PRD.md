# PRD — Nirmala Exchange

PRD ini disusun bertahap. Bagian di bawah hanya mencakup apa yang sudah
disepakati sejauh ini (lihat `PLAN.md` untuk catatan mentah diskusi).

---

## 1. Identitas & Target

- **Nama aplikasi:** Nirmala Exchange
- **Model:** AMM constant-product (`x * y = k`), bergaya Uniswap V2
- **Target deploy:** testnet — BNB testnet atau Base Sepolia (*chain final belum dikunci*)

## 2. Tech Stack

| Komponen | Pilihan | Catatan |
|---|---|---|
| Framework | Foundry (forge, cast, anvil) | |
| Bahasa | Solidity **0.8.29** | dipin di `foundry.toml` (`solc = "0.8.29"`) dan di semua `pragma`; bukan versi paling baru (0.8.35+) karena rilis terbaru itu baru banget, tooling editor (extension Hardhat Solidity) belum ngejar dan masih ke-cache ke build nightly yang salah |
| Library eksternal | OpenZeppelin Contracts **v5.7.0** | dipin exact release tag, bukan default branch; sejauh ini untuk ERC20; primitive lain belum diputuskan |
| Testing | `forge test`, fuzz test, invariant test | |
| Local chain | Anvil | WETH mock dipakai khusus di sini |

**Catatan teknis (peringatan, bukan keputusan):** Uniswap V2 asli ditulis di
Solidity 0.5.16 dan sengaja mengandalkan integer overflow pada akumulator harga
(`price0CumulativeLast`, `price1CumulativeLast`, `blockTimestampLast`). Di
Solidity 0.8.x overflow menyebabkan revert, sehingga bagian ini nanti wajib
dibungkus `unchecked` dengan alasan dicatat di `NOTE.md`. `SafeMath` ala
Uniswap V2 tidak diperlukan sama sekali di 0.8.x.

## 3. Struktur Folder

```
dex/
├── CLAUDE.md
├── PRD.md
├── PLAN.md
├── NOTE.md
├── smart-contract/
│   ├── foundry.toml
│   ├── remappings.txt
│   ├── .env.example
│   ├── lib/
│   ├── src/
│   │   ├── interfaces/          ← semua interface
│   │   ├── libraries/           ← logic matematika & helper
│   │   ├── NirmalaToken.sol
│   │   ├── NirmalaFactory.sol
│   │   ├── NirmalaPair.sol
│   │   └── NirmalaRouter.sol    ← digabung, tidak dipisah repo periphery
│   ├── test/
│   │   ├── mocks/
│   │   │   └── WETH9.sol        ← khusus Anvil/test lokal
│   │   └── invariant/
│   └── script/
│       ├── HelperConfig.s.sol   ← alamat WETH/WBNB per chain
│       └── DeployNirmala.s.sol
└── frontend/                    ← belum dikerjakan, fokus sc dulu
```

## 4. Penempatan file yang tadinya belum jelas

**`WETH9.sol` → `smart-contract/test/mocks/WETH9.sol`**

WETH hanya di-deploy sendiri untuk testing lokal di Anvil. Saat deploy ke
testnet, contract memakai WETH/WBNB canonical yang sudah ada di chain
tersebut, alamatnya dibaca lewat `HelperConfig.s.sol` per `chainid`. Karena
itu `WETH9.sol` tidak masuk `src/`, supaya tidak pernah ikut ter-deploy ke
testnet secara tidak sengaja.

## 5. Keputusan desain protokol

- **Protocol fee: tidak ada.** Tidak ada `feeTo`/`feeToSetter`/`kLast`/`_mintFee()` — mekanisme ini dihapus total dari desain, bukan sekadar di-nolkan. Konsekuensi: `NirmalaFactory` tidak butuh admin/owner untuk urusan fee sama sekali.
- **TWAP oracle: dipertahankan.** `price0CumulativeLast`, `price1CumulativeLast`, `blockTimestampLast` tetap ada di `NirmalaPair`, termasuk overflow yang disengaja (lihat catatan `unchecked` di bagian Tech Stack).
- **Flash swap: didukung.** `NirmalaPair.swap()` mendukung optional callback (borrow now, pay/return later dalam 1 transaksi), butuh interface callback (mis. `INirmalaCallee`) di `interfaces/`.
- **Swap fee ke LP: 0.30%**, tetap (fixed constant di `NirmalaLibrary`, sama seperti Uniswap V2 — `amountInWithFee = amountIn * 997`). Tidak admin-adjustable, konsisten dengan keputusan tidak ada admin/owner untuk urusan fee.

## 6. Core Contract — NirmalaToken.sol

`NirmalaToken.sol` adalah token base ERC20 untuk LP share, nanti di-inherit oleh `NirmalaPair`. Implementasinya inherit `ERC20` + `ERC20Permit` dari OpenZeppelin, jadi fungsi-fungsi di bawah ini didapat dari inheritance, bukan ditulis ulang.

| Fungsi | Kegunaan |
|---|---|
| `_mint()` | nambah supply LP token di contract, dan nambah saldo user yang mint |
| `_burn()` | kebalikannya, ngurangin supply LP token di contract dan saldo user |
| `_approve()` | atur allowance, berapa token yang kita izinkan dipakai orang lain |
| `_transfer()` | kurangi token dari satu address, tambah ke address lain |
| `transfer()` | versi publik, msg.sender sebagai pengirim, manggil `_transfer()` |
| `approve()` | versi publik, msg.sender sebagai owner, manggil `_approve()` |
| `transferFrom()` | kirim dari address 1 ke address 2, allowance-nya ikut berkurang |
| `permit()` | approval lewat signature, pakai domain separator dan chain id |

Dua keputusan turunan dari pilihan OpenZeppelin:
- **MINIMUM_LIQUIDITY dikunci ke `address(1)`**, bukan `address(0)` seperti Uniswap V2 asli — karena OZ menolak mint ke `address(0)`. `address(1)` gak punya private key dan gak punya kode buat mindahin saldo keluar, jadi efek terkuncinya sama persis.
- **`name`/`symbol` LP token sama untuk semua pair** — di-hardcode konstan di constructor (bukan dibuat dinamis per pair), supaya init code hash tetap sama dan alamat pair bisa dihitung lewat `CREATE2`. Sama seperti Uniswap V2 (semua LP token-nya juga namanya sama, `"Uniswap V2"`/`UNI-V2`), bedanya di kita ini harus dijaga sebagai disiplin constructor karena OZ menjadikan `name`/`symbol` sebagai parameter, bukan `constant` bawaan bahasa.

Tidak ada variabel state, getter, atau event tambahan di `NirmalaToken.sol` di luar bawaan `ERC20`/`ERC20Permit` dari OZ.

## 7. Library — `src/libraries/`

| Fungsi | Dari mana | Gunanya |
|---|---|---|
| `min()` | OZ `@openzeppelin/contracts/utils/math/Math.sol` | ambil nilai terkecil dari dua angka |
| `sqrt()` | OZ `@openzeppelin/contracts/utils/math/Math.sol` | akar kuadrat integer |

Keduanya langsung di-import dari OZ, bukan ditulis ulang — `Math.sol`/`SafeMath.sol` ala Uniswap V2 tidak dibuat sebagai file kita sendiri (`SafeMath` juga berlebihan karena Solidity 0.8.x otomatis revert kalau overflow/underflow).

Satu-satunya file baru di `src/libraries/`: **`UQ112x112.sol`** — fixed-point encoding buat akumulasi harga TWAP (PRD bagian 5), tidak ada padanan di OZ. Isinya belum dirancang.

`NirmalaLibrary.sol` (setara `UniswapV2Library`: `getAmountOut`, `getAmountIn`, `quote`, `sortTokens`, `pairFor`) juga masih perlu, dipakai `NirmalaRouter.sol` buat estimasi swap dan hitung alamat pair — desain lengkap di bagian 10.

## 8. Core Contract — NirmalaPair.sol

`NirmalaPair.sol` memegang custody dana beneran — reserve token0/token1 — dan menjalankan matematika swap/mint/burn LP. `NirmalaPair is NirmalaToken, ReentrancyGuard`.

Empat keputusan desain (semua modernisasi dari referensi Uniswap V2 0.5.16, konsisten sama pola "pakai OZ kalau ada yang setara" yang udah kita jalanin di `NirmalaToken`/`Math`):
- **Transfer token internal pakai OZ `SafeERC20`**, bukan fungsi `_safeTransfer` manual — konsisten sama keputusan `TransferHelper.sol` yang udah dihapus total.
- **Reentrancy guard pakai OZ `ReentrancyGuard`** (`nonReentrant`), bukan modifier `lock` custom.
- **`factory` disimpan `immutable`**, di-set di constructor lewat `msg.sender` (lebih hemat gas dari mutable state var; Uniswap V2 pakai mutable cuma karena Solidity 0.5.16 belum ada keyword `immutable`).
- **`initialize()` ada guard eksplisit** `token0 == address(0)` selain cek `msg.sender == factory`, supaya nggak bisa di-re-init walau ada bug di Factory suatu saat.

Constructor kosong — `token0`/`token1` BELUM di-set di constructor, karena `NirmalaFactory` deploy `NirmalaPair` pakai `CREATE2` tanpa constructor argument (alasan yang sama kayak `name`/`symbol` hardcode di `NirmalaToken`: init code hash harus konstan), lalu manggil `initialize(token0, token1)` sekali tepat setelah deploy.

| Fungsi | Kegunaan |
|---|---|
| `getReserves()` | baca `reserve0`, `reserve1`, `blockTimestampLast` — dipacking jadi 1 storage slot (`uint112`/`uint112`/`uint32`) buat hemat gas |
| `initialize()` | dipanggil sekali oleh `NirmalaFactory` tepat setelah deploy, nge-set `token0`/`token1` pasangan pair ini. Revert kalau bukan factory yang manggil, atau kalau udah pernah di-set |
| `_update()` | update `reserve0`/`reserve1` berdasarkan saldo token aktual, dipanggil di akhir `mint`/`burn`/`swap`/`sync`. Tempat akumulator TWAP (`price0CumulativeLast`/`price1CumulativeLast`) di-update pakai `UQ112x112`, dengan overflow yang disengaja (`unchecked`, sesuai catatan Tech Stack) |
| `mint()` | user (lewat Router) transfer token0+token1 ke pair DULU, baru panggil `mint()`. Hitung selisih saldo aktual vs reserve tercatat → jumlah yang baru masuk → dikonversi jadi LP token buat `to`. Liquidity pertama kali: `MINIMUM_LIQUIDITY` (1000 wei LP) dikunci ke `address(1)` sebagai fondasi pool (cegah share-inflation attack) |
| `burn()` | kebalikan `mint()` — user transfer LP token ke pair DULU, baru panggil `burn()`. Burn LP token yang ada di saldo pair sendiri, hitung proporsi token0/token1 yang berhak didapat `to`, transfer keluar |
| `swap()` | lihat penjelasan di bawah |
| `skim()` | siapa aja boleh panggil — transfer kelebihan saldo token (di atas reserve tercatat) ke alamat `to` pilihan pemanggil. Buat "bersihin" token yang nyasar kekirim langsung ke pair tanpa lewat `mint`/`sync` |
| `sync()` | paksa `reserve0`/`reserve1` disamain ke saldo token aktual sekarang. Buat recovery kalau reserve ke-desync dari saldo asli |

### Mekanisme `swap()`

1. **Optimistic transfer** — pair transfer DULU `amount0Out`/`amount1Out` ke `to` (salah satu boleh 0, tapi nggak boleh dua-duanya 0), sebelum tau apakah pembayarannya cukup.
2. **Flash swap callback (opsional)** — kalau ada `data` dikirim, pair manggil balik `to` (kontrak yang implement `INirmalaCallee`) SEBELUM ngecek pembayaran — di sinilah user bisa "pinjam dulu, bayar belakangan" dalam 1 transaksi, sesuai keputusan flash swap di bagian 5.
3. **Hitung amountIn** — pair baca saldo token sekarang (setelah transfer + callback), bandingin sama `reserve - amountOut`. Selisihnya adalah `amountIn`. Kalau kedua sisi 0 → revert (nggak ada yang bayar).
4. **Cek K-invariant** — ini yang beneran nge-enforce swap fee 0.30%: hasil kali reserve SETELAH swap (dikurangi fee 0.3% dari yang masuk) harus tetap ≥ hasil kali SEBELUM swap. Ini yang bikin harga bergerak sesuai kurva `x*y=k` dan mencegah drain pool tanpa bayar cukup.
5. Ada pengecekan `to != token0 && to != token1` — cegah kirim ke alamat token itu sendiri.

### Trust assumption

- `mint()`/`burn()` pakai pola **transfer dulu, baru panggil** — pair nggak narik token dari caller. Kalau dipanggil langsung (bukan lewat `NirmalaRouter`), user wajib transfer manual dulu, atau dana bisa nyangkut/ketuker transaksi lain di block yang sama (makanya butuh `nonReentrant`).
- `skim()` permissionless dan `to`-nya bebas dipilih pemanggil — siapa pun yang notice dana nyasar di pair bisa "duluan" nge-skim ke alamat manapun.

### Dependency baru

`src/interfaces/INirmalaCallee.sol` — interface callback flash swap, dipanggil `swap()` kalau `data.length > 0`. Isinya cuma 1 fungsi (`nirmalaCall`), harus di-implement contract yang mau nerima flash swap (bukan wallet biasa) — kalau `to` bukan contract yang implement ini atau `data` kosong, callback ini otomatis di-skip dan swap jalan normal biasa.

| Fungsi | Kegunaan |
|---|---|
| `nirmalaCall()` | dipanggil `NirmalaPair.swap()` di tengah proses, setelah token dikirim tapi sebelum pembayaran dicek — kasih kesempatan si penerima "pakai dulu" token yang dipinjam sebelum bayar balik di transaksi yang sama |

## 9. Core Contract — NirmalaFactory.sol

`NirmalaFactory.sol` bertanggung jawab deploy `NirmalaPair` baru lewat `CREATE2` dan nyatet semua pair yang udah dibuat. Permissionless — siapa aja boleh manggil `createPair()`, konsisten sama keputusan "tidak ada admin/owner" di bagian 5 (tidak ada fee, jadi tidak ada alasan butuh akses kontrol di factory).

State:
- `mapping(address => mapping(address => address)) public getPair` — lookup pair address dari dua token, dua arah (`getPair[tokenA][tokenB]` dan `getPair[tokenB][tokenA]` sama-sama nunjuk ke pair yang sama)
- `address[] public allPairs` — daftar semua pair yang pernah dibuat, urut sesuai waktu deploy

| Fungsi | Kegunaan |
|---|---|
| `allPairsLength()` | return jumlah pair yang udah dibuat (`allPairs.length`) |
| `createPair(address tokenA, address tokenB)` | bikin pair baru buat pasangan token, return `address pair` |

### Mekanisme `createPair()`

1. **Cek identical address** — `require(tokenA != tokenB)`. Ini WAJIB di paling awal, sebelum sorting — kalau di-skip, `createPair(tokenX, tokenX)` bisa lolos (hasil sorting `token0 == token1 == tokenX`, keduanya bukan `address(0)`, dan `getPair[tokenX][tokenX]` awalnya kosong sehingga cek "belum pernah dibuat" juga lolos), yang bikin pair token vs dirinya sendiri ke-deploy.
2. **Sort token** — `(token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA)`, biar alamat pair yang dihasilin `CREATE2` konsisten terlepas urutan argumen yang dipanggil caller.
3. **Cek zero address** — `require(token0 != address(0))`. Cukup cek `token0` aja (yang lebih kecil setelah sorting) — kalau `token0` bukan nol, otomatis `token1` juga bukan nol karena udah lolos cek identical address di langkah 1.
4. **Cek pair belum ada** — `require(getPair[token0][token1] == address(0))`.
5. **Deploy via CREATE2** — `type(NirmalaPair).creationCode`, tanpa constructor argument (konsisten sama keputusan constructor kosong di `NirmalaPair`, lihat bagian 8), salt = `keccak256(abi.encodePacked(token0, token1))`.
6. **Initialize** — panggil `NirmalaPair(pair).initialize(token0, token1)` sekali, tepat setelah deploy.
7. **Catat ke `getPair`** — set dua arah, `getPair[token0][token1] = pair` dan `getPair[token1][token0] = pair`.
8. **Push ke `allPairs`** dan **emit `PairCreated`**.

### Event

`event PairCreated(address indexed token0, address indexed token1, address pair, uint256 pairIndex)` — dipakai indexer/subgraph nangkep pair baru; `pairIndex` adalah `allPairs.length` setelah push (posisi pair di array).

## 10. Library — NirmalaLibrary.sol

Setara `UniswapV2Library` — kumpulan fungsi murni (`internal`, di-inline ke pemanggil, tidak di-deploy terpisah) buat estimasi swap dan hitung alamat pair tanpa perlu query storage Factory. Dipakai `NirmalaRouter.sol`.

| Fungsi | Kegunaan |
|---|---|
| `sortTokens(tokenA, tokenB)` | urutin dua alamat token supaya `token0 < token1`, konsisten sama logic sorting di `NirmalaFactory.createPair()`. Revert kalau identical atau zero address |
| `pairFor(factory, tokenA, tokenB)` | hitung alamat `NirmalaPair` langsung dari rumus CREATE2 (`keccak256(0xff, factory, salt, initCodeHash)`), tanpa external call ke Factory — makanya lebih hemat gas dipanggil berkali-kali di hot path Router |
| `getReserves(factory, tokenA, tokenB)` | ambil reserve pair, dikembalikan **sesuai urutan `tokenA`/`tokenB` yang caller kasih** (bukan urutan sorted `token0`/`token1`) — biar Router nggak perlu inget-inget urutan sort sendiri di tiap pemanggilan |
| `quote(amountA, reserveA, reserveB)` | hitung `amountB` yang proporsional sama rasio reserve pool saat ini — dipakai `addLiquidity` di Router biar rasio token yang dimasukin selalu ngikutin rasio pool |
| `getAmountOut(amountIn, reserveIn, reserveOut)` | estimasi berapa token keluar kalau masukin `amountIn`, udah kepotong fee 0.30% (`amountIn * 997 / 1000`, sama kayak `NirmalaPair.swap()`) |
| `getAmountIn(amountOut, reserveIn, reserveOut)` | kebalikannya — estimasi berapa token yang perlu dimasukin buat dapet `amountOut` yang diinginkan, fee 0.30% juga |
| `getAmountsOut(factory, amountIn, path)` | loop `getAmountOut` sepanjang `path` (array alamat token, multi-hop), hasilnya array `amounts` per-hop |
| `getAmountsIn(factory, amountOut, path)` | kebalikannya, loop mundur dari akhir `path` |

**Keputusan desain:**
- **Init code hash di-hardcode** sebagai `bytes32 constant`, bukan dihitung ulang tiap panggil lewat `keccak256(type(NirmalaPair).creationCode)`. Alasan: `pairFor()` dipanggil berkali-kali per transaksi (tiap hop di `getAmountsOut`/`getAmountsIn`), dan ngitung hash dari seluruh creation code kontrak tiap kali itu mahal. Risiko hash jadi stale kalau `NirmalaPair.sol` berubah ditangkep lewat test yang assert `PAIR_INIT_CODE_HASH == keccak256(type(NirmalaPair).creationCode)` — kalau kontrak berubah, test gagal duluan sebelum sempat ke-deploy dengan hash yang salah.
- **`getReserves()` return sesuai urutan input caller**, bukan sorted — beda dari sekilas baca `UniswapV2Library` yang juga gitu (sorting cuma dipakai internal buat nyari alamat pair via `pairFor`).
- **`NirmalaFactory.createPair()` TIDAK di-refactor** manggil `NirmalaLibrary.sortTokens()` — logic sorting-nya identik tapi dibiarkan terpisah (tidak menyentuh kode Factory yang udah dites), biar perubahan di `NirmalaLibrary.sol` nggak berisiko ke kontrak yang custody dana.

### Trust assumption

`getReserves()`/`pairFor()` nggak ngecek pair-nya udah pernah dibuat via Factory apa belum — kalau pair belum ada, `getReserves()` bakal manggil alamat tanpa kode dan revert. `NirmalaRouter.sol` (belum ditulis) yang nanti wajib mastiin `createPair()` dipanggil dulu sebelum nyoba interaksi apapun ke pair itu.

## 11. Core Contract — NirmalaRouter.sol (bagian liquidity)

`NirmalaRouter.sol` adalah entry point yang user beneran pakai — narik token dari user (lewat allowance), transfer ke pair, panggil `mint`/`burn`. Dibangun bertahap: sesi ini cuma bagian liquidity (`add`/`remove`), swap dibahas sesi berikutnya. Router nggak custody dana sama sekali di luar 1 transaksi (nggak ada admin/pause, konsisten PRD bagian 5).

State: `address public immutable factory`, `address public immutable WETH` — dua-duanya di-set di constructor, nggak pernah berubah.

| Fungsi | Kegunaan |
|---|---|
| `_addLiquidity(...)` | `internal` — hitung `amountA`/`amountB` optimal. Kalau pair belum ada, bikin dulu lewat `factory.createPair()`. Kalau reserve masih 0/0 (liquidity pertama), pakai `amountADesired`/`amountBDesired` apa adanya. Kalau udah ada reserve, `quote()` B dari A dulu — kalau `amountBOptimal <= amountBDesired` pakai itu (dicek juga `>= amountBMin`), kalau nggak `quote()` A dari B (dicek `<= amountADesired` dan `>= amountAMin`) |
| `addLiquidity(...)` | versi ERC20-ERC20. Panggil `_addLiquidity`, `safeTransferFrom` kedua token dari `msg.sender` langsung ke alamat pair (dihitung lewat `NirmalaLibrary.pairFor`, tanpa external call), baru `NirmalaPair.mint(to)` |
| `addLiquidityETH(...)` | versi ERC20-ETH. Terima `msg.value` sebagai `amountETHDesired`. `safeTransferFrom` token ke pair, `IWETH.deposit{value: amountETH}()` lalu kirim WETH-nya ke pair, `mint(to)`. **Sisa ETH yang nggak kepake (`msg.value - amountETH`) di-refund ke `msg.sender`** |
| `removeLiquidity(...)` | `safeTransferFrom` LP token dari `msg.sender` ke pair, `NirmalaPair.burn(to)`, cek hasil `amount0`/`amount1` (di-map balik ke urutan A/B pakai `sortTokens`) terhadap `amountAMin`/`amountBMin` |
| `removeLiquidityETH(...)` | panggil `removeLiquidity` dengan `to = address(this)`, token non-ETH langsung `safeTransfer` ke `to` asli, WETH-nya `IWETH.withdraw()` lalu ETH native dikirim ke `to` pakai OZ `Address.sendValue` |
| `removeLiquidityWithPermit(...)` / `removeLiquidityETHWithPermit(...)` | varian yang nerima signature (`v,r,s` + `approveMax`) buat approve LP token via `permit()` dalam 1 transaksi, tanpa perlu `approve()` terpisah duluan |

**Keputusan desain:**
- **Slippage protection (`amountAMin`/`amountBMin`/`amountTokenMin`/`amountETHMin`) wajib di semua fungsi add/remove** — tanpa ini, rasio pool bisa berubah antara user sign tx dan tx dieksekusi (disandwich), user bisa nerima rasio/jumlah jauh dari yang diharapkan.
- **`removeLiquidity` bersifat `public`** (bukan `external`), supaya bisa dipanggil langsung dari `removeLiquidityETH` — `msg.sender` tetap user asli di internal call, jadi `transferFrom` LP token tetap narik dari user, bukan dari Router.
- **Permit dibungkus `try/catch`** — kalau signature permit udah "dipakai duluan" oleh pihak lain di mempool (front-run yang legit, bukan serangan — siapapun bisa nyubmit signature yang sama karena itu public data), Router cek dulu allowance yang ada ke pair udah cukup apa belum sebelum ngelanjut, bukan langsung revert. Deviasi dari Uniswap V2 yang manggil `permit()` langsung tanpa guard.
- **Tidak ada event tambahan di Router** — `NirmalaPair` udah emit `Mint`/`Burn`/`Sync` sendiri; event di Router cuma bakal duplikat data yang sama.
- **Tidak ada `nonReentrant`** — Router nggak nyimpen state apapun dan dana cuma transit dalam 1 transaksi (nggak pernah "parkir" antar-transaksi); kontrak yang beneran custody dana (`NirmalaPair`) udah `nonReentrant`.
- **Belum mendukung token fee-on-transfer** — item ini masih "belum diputuskan" (lihat bagian 12); kalau nanti didukung, butuh varian terpisah (`removeLiquidity`/`swap` yang baca balance aktual pair setelah transfer, bukan percaya `amountA`/`amountB` yang dihitung).

### WETH per environment

- **Anvil/test:** `test/mocks/WETH9.sol` — mock minimal, di-deploy sendiri tiap kali test/Anvil jalan. **Tidak pernah masuk `src/`** (lihat bagian 4), supaya nggak ke-deploy tanpa sengaja ke testnet/mainnet.
- **Testnet:** alamat WETH/WBNB canonical yang udah ada di chain itu, dibaca lewat `HelperConfig.s.sol` per `chainid` — belum dikerjakan, nunggu chain final dikunci.

### Trust assumption

Router mengasumsikan `factory`/`WETH` yang di-set di constructor itu benar dan nggak berubah (`immutable`). Router nggak ngecek ulang bahwa alamat pair hasil `NirmalaLibrary.pairFor()` itu beneran kontrak `NirmalaPair` yang valid — ini konsisten sama Uniswap V2 Router, karena alamat itu dihitung deterministik dari `factory` + init code hash yang juga `immutable`/`constant`.

## 12. Core Contract — NirmalaRouter.sol (bagian swap)

Lanjutan bagian 11 (liquidity). Router menerima `path` (array alamat token, hop demi hop) dan mengeksekusi swap lewat rangkaian `NirmalaPair.swap()`, tanpa pernah menahan token lebih dari 1 transaksi.

| Fungsi | Kegunaan |
|---|---|
| `_swap(amounts, path, _to)` | `internal` — loop tiap hop di `path`. Tiap hop: sort `input`/`output` token buat nentuin `amount0Out`/`amount1Out` (salah satu 0), lalu panggil `NirmalaPair(pairFor(input, output)).swap(amount0Out, amount1Out, to, "")`. `data` selalu kosong — Router nggak pernah pakai flash swap callback punya sendiri |
| `swapExactTokensForTokens(...)` | hitung `amounts` lewat `getAmountsOut`, cek `amounts[last] >= amountOutMin`, `safeTransferFrom` token pertama dari `msg.sender` ke pair pertama, panggil `_swap` |
| `swapTokensForExactTokens(...)` | kebalikannya — `getAmountsIn`, cek `amounts[0] <= amountInMax`, transfer & `_swap` sama seperti di atas |
| `swapExactETHForTokens(...)` | versi ETH masuk. `path[0]` wajib `WETH`. `amounts` dari `getAmountsOut(msg.value, path)`, cek `amounts[last] >= amountOutMin`, `IWETH.deposit{value: amounts[0]}()` lalu WETH-nya ditransfer ke pair pertama, `_swap` |
| `swapTokensForExactETH(...)` | `path[last]` wajib `WETH`. `getAmountsIn`, cek `amounts[0] <= amountInMax`, transfer token in ke pair pertama, `_swap` dengan `_to = address(this)`, lalu `IWETH.withdraw` dan `Address.sendValue` ETH-nya ke `to` |
| `swapExactTokensForETH(...)` | `path[last]` wajib `WETH`. `getAmountsOut`, cek `amounts[last] >= amountOutMin`, transfer & `_swap` ke `address(this)`, withdraw + sendValue sama seperti di atas |
| `swapETHForExactTokens(...)` | `path[0]` wajib `WETH`. `getAmountsIn(amountOut, path)`, cek `amounts[0] <= msg.value`, deposit + transfer WETH ke pair pertama, `_swap` ke `to`. **Sisa ETH (`msg.value - amounts[0]`) di-refund** ke `msg.sender`, pola sama `addLiquidityETH` |
| `quote`, `getAmountOut`, `getAmountIn`, `getAmountsOut`, `getAmountsIn` | wrapper `public`/`view`/`pure` tipis, langsung delegasi ke `NirmalaLibrary` — dipakai frontend buat estimasi harga & hitung `amountOutMin`/`amountInMax` sebelum user sign transaksi |

### Mekanisme `_swap`

Tiap hop `i` di `path`: token `output` hop ini jadi token `input` hop berikutnya. `to` tujuan transfer hop `i` adalah alamat pair hop berikutnya (`pairFor(path[i+1], path[i+2])`) kalau bukan hop terakhir, atau `_to` asli kalau ini hop terakhir — biar token nggak pernah mampir ke Router di antara hop (konsisten prinsip Router nggak custody dana, bagian 11).

**Keputusan desain:**
- **Slippage protection wajib**: `amountOutMin` di semua fungsi exact-in, `amountInMax` di semua fungsi exact-out (termasuk `msg.value` sebagai `amountInMax` implisit di `swapETHForExactTokens`) — alasan sama bagian 11 (cegah sandwich antara sign & eksekusi tx).
- **Validasi `path[0]`/`path[last]` harus `WETH`** di keempat fungsi ETH — kalau di-skip, Router bakal nyoba `IWETH.deposit`/`withdraw` padahal token pertama/terakhir bukan WETH, hasilnya token nyangkut atau salah kirim.
- **Tidak ada dukungan fee-on-transfer** (`swapExactTokensForTokensSupportingFeeOnTransferTokens` dkk. dari Uniswap V2 TIDAK dibuat) — item ini sempat "belum diputuskan", sekarang dikunci: token fee-on-transfer di-swap lewat fungsi biasa akan revert bersih (`NirmalaPair__K`, karena `amountOut` dihitung dari `amounts[]` yang di-precompute, bukan dari selisih balance aktual pair). Bukan fund-loss, cuma limitasi fitur — bisa ditambah nanti tanpa nyentuh `NirmalaPair`/`NirmalaFactory` kalau suatu saat dibutuhkan.
- **Tidak ada `nonReentrant`/event tambahan** — alasan sama bagian 11 (Router nggak custody dana antar-transaksi, `NirmalaPair` udah emit `Swap` sendiri).
- **View helper cuma delegasi**, tidak ada logic baru — `NirmalaLibrary` tetap satu-satunya tempat rumus matematika swap, Router cuma nyediain entry point `public` karena fungsi `internal` di library nggak bisa dipanggil langsung dari luar kontrak.

### Trust assumption

`_swap` nggak ngecek pair di tiap hop udah pernah dibuat via Factory — kalau `path` ngandung pasangan token yang pair-nya belum ada, `getAmountsOut`/`getAmountsIn` (lewat `NirmalaLibrary.getReserves`) bakal manggil alamat tanpa kode dan revert duluan sebelum sempat transfer apapun. Beda dari `addLiquidity`/`addLiquidityETH` yang auto-`createPair()` kalau belum ada — swap nggak auto-create karena bikin pair kosong (reserve 0/0) di tengah path cuma bakal bikin `getAmountOut` revert lebih lambat (`NirmalaLibrary__InsufficientLiquidity`), bukan berhasil.

## 13. Belum diputuskan (dibahas bertahap di sesi berikutnya)

- Chain target final (BNB testnet vs Base Sepolia) + `evm_version` yang cocok
