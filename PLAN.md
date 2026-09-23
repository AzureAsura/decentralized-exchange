oke sekarang kita lanjut untuk bkin function mint

foa jelas declare dlu minimum liquidity aku mau samain kaya uniswap pake 10**3

lalu kita mulai function mint()

jadi pertama jelas kita harus ambil dlu reserve yang ada dari getreserve()

lalu kita declare balance dari token0 dan token1

nah stelah dapet reserve dan balance baru kita bisa bandingkan

nah abistu kita bandingin kalau totalsupplynua masi kosong atau liquidty kosong makesure kunci dana awal sebesar minimum liquidity ke address (1)

jadi amountnya dia di kurang liquidity minimum nah liquisity minimum mint ke address 1

jika sudah ada minimum liquidity ya tinggal langsung hitung lp tokennya amountnya dia x total suply lalu / reserve ambil yang terkecil untuk lpnya biar balance

lalu tambah proteksi lagi dengan require makesure ada minimal lebih dari 0 lp token yang ke declare hitung hitungan

stelah itu baru gasmint kirim ke usernya

jika sudah tinggal _update() reserve lalu buat event