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

## 7. Belum diputuskan (dibahas bertahap di sesi berikutnya)

- Chain target final (BNB testnet vs Base Sepolia) + `evm_version` yang cocok
- Dukungan token fee-on-transfer
