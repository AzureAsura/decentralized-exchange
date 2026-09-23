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

`NirmalaLibrary.sol` (setara `UniswapV2Library`: `getAmountOut`, `getAmountIn`, `quote`, `sortTokens`, `pairFor`) juga masih perlu, tapi dibahas belakangan — dipakai `NirmalaRouter.sol` buat estimasi swap dan hitung alamat pair.

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

## 9. Belum diputuskan (dibahas bertahap di sesi berikutnya)

- Chain target final (BNB testnet vs Base Sepolia) + `evm_version` yang cocok
- Dukungan token fee-on-transfer
- Isi `NirmalaLibrary.sol`
