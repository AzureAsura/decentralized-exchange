oke mungkin aku mulai start ngasi tau isi core contractnya

mulai dari nirmalatoken.sol , nah benar seperti yang kamu bilang file ini berfungsi sebagai token base aku mau kamu tulis di prdnya untuk apa aja isi file contract token ini dengan tidak ada sintax yang tertulis ya

fungsi yang pertama aku mau ada jelas _mint() , gunanya untuk nambahin lp token supply di contract dan nambah value user yang mint lp token

lalu _burn(), kebalikannya ngurangin lp token suply contract dan dari user

kemudian _approve(), , nah ini jelas untuk allowance gimana berapa token kita kita izinin orang yang kita makai sesuai yang kita mau

lalu ada _transfer() , jelas ini gunanya untuk mengurangi token dari 1 orang , lalu orang lainnya akan nambah

lalu ada approve() dimana func ini memanggil func lib ya jatuhnya _approve() , jadi biar kita misal masukin msg.sendernya sebagai from lalu to nya siapa

sengaja aku pisah biar barangkali reusable

lalu ada transferFrom(), dimana func ini mengizinkan orang mengirim dari address 1 ke address 2 dan jika ada allowance berapa makainya nanti ada pengurangan di allowancenya bantu di tf

lalu aku juga mau menambahkan func permit(), dengan adanya enkripsi dari domain seperator chain id dll

nah itu sih kata kata dariku mungkin bisa di taruh di prd , dan jika ada yang kurang jelas bilang , dan makesure ikuti instruksiku jangan tiba tiba prdnya ngebold banyak banget kamu improve

---

## [Claude] Referensi kode — perbandingan Uniswap V2 asli vs versi kita (OZ)

Bukan bagian dari PRD, cuma referensi buat bantu ngerti dua konsekuensi pakai OZ. Belum ada yang di-implementasi.

### 1. Mengunci MINIMUM_LIQUIDITY

**Uniswap V2 asli** (`UniswapV2Pair.sol`, Solidity 0.5.16) — mint ke `address(0)`:

```solidity
uint public constant MINIMUM_LIQUIDITY = 10**3;

function mint(address to) external lock returns (uint liquidity) {
    (uint112 _reserve0, uint112 _reserve1,) = getReserves();
    uint balance0 = IERC20(token0).balanceOf(address(this));
    uint balance1 = IERC20(token1).balanceOf(address(this));
    uint amount0 = balance0.sub(_reserve0);
    uint amount1 = balance1.sub(_reserve1);

    uint _totalSupply = totalSupply;
    if (_totalSupply == 0) {
        liquidity = Math.sqrt(amount0.mul(amount1)).sub(MINIMUM_LIQUIDITY);
        _mint(address(0), MINIMUM_LIQUIDITY); // dikunci selamanya
    } else {
        liquidity = Math.min(amount0.mul(_totalSupply) / _reserve0, amount1.mul(_totalSupply) / _reserve1);
    }
    require(liquidity > 0, 'UniswapV2: INSUFFICIENT_LIQUIDITY_MINTED');
    _mint(to, liquidity);
    ...
}
```

**Versi kita** (konsep, belum ditulis beneran) — OZ nolak mint ke `address(0)`, jadi ganti tujuan:

```solidity
uint256 public constant MINIMUM_LIQUIDITY = 10**3;
address public constant BURN_ADDRESS = address(1); // ganti address(0), OZ akan revert kalau tetap pakai address(0)

function mint(address to) external returns (uint256 liquidity) {
    ...
    if (totalSupply() == 0) {
        liquidity = Math.sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY;
        _mint(BURN_ADDRESS, MINIMUM_LIQUIDITY); // dikunci selamanya, efeknya sama persis
    } else {
        liquidity = Math.min(amount0 * totalSupply() / reserve0, amount1 * totalSupply() / reserve1);
    }
    require(liquidity > 0, "insufficient liquidity minted");
    _mint(to, liquidity);
    ...
}
```

Cuma beda alamat tujuan (`address(0)` → `address(1)`), logikanya identik.

### 2. name/symbol konstan

**Uniswap V2 asli** (`UniswapV2ERC20.sol`) — bukan parameter constructor sama sekali, jadi gak mungkin beda per pair:

```solidity
contract UniswapV2ERC20 {
    string public constant name = 'Uniswap V2';
    string public constant symbol = 'UNI-V2';
    uint8 public constant decimals = 18;
    ...
}
```

**Versi kita, cara yang SALAH** — name dibikin dinamis per pair, bikin init code hash beda-beda, `CREATE2` jadi gak bisa dipakai buat nebak alamat:

```solidity
// JANGAN begini — name beda tiap pair = init code hash beda tiap pair
constructor(address _token0, address _token1)
    ERC20(
        string.concat("Nirmala LP: ", IERC20Metadata(_token0).symbol(), "/", IERC20Metadata(_token1).symbol()),
        "NIR-LP"
    )
{ ... }
```

**Versi kita, cara yang BENAR** — string di-hardcode sama persis di constructor, walaupun secara teknis itu parameter yang bisa diisi beda:

```solidity
constructor(address _token0, address _token1)
    ERC20("Nirmala LP", "NIR-LP")
{ ... }
```

Hasil akhirnya sama kayak Uniswap V2 (semua LP token namanya sama), tapi di kita ini harus dijaga sebagai disiplin — karena OZ bikin `name`/`symbol` jadi parameter yang *bisa* diubah, beda dari Uniswap V2 yang `constant` dan strukturnya emang gak ngasih ruang buat salah.