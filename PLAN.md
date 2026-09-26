lanjut ke router.sol bagian swap 

aku mau bkin lib func untuk _swap() caranya dengan lakukan loop path lalu ambil token yang masuk apa dan token yang keluar apa stelah itu kita sort tokennya lalu di parameter udah ada amount kita ambil yang +1 wich yang kedua berarti sebagai amountout stelah itu baru kita bisa dapet amount0out nya berapa misal 0 dan amount1outnya berapa misal sejumlah token, stelah itu baru kita ambil pair dan langsung call func swap dari pair dan masukin parameteramount0out yg tadi kita udah dapet

lalu masuk ke main func swapExactTokensForTokens(), nah lanjut ini ambil dlu amoutnya pake getamountsout kasi validasi makesure amountoutnya lebih dari minimal , lalu langsung transfer token dari pair pertama dam masukkan jumlaha amount pertama stelah itu call func _swap

lalu lanjut ke func swapTokensForExactTokens() ini kebalikannya tinggal pake getamounts in abistu lakuin hal yang sama transfer ke pair pertama dan call func _swap

lalu lanjut ke swapExactETHForTokens() nah ini kan dari eth jadi harus makesure path pertama itu weth  lalu sama tinggal call getamountsout lalu deposit weth tf weth ke pair pertama lalu call func _swap

lalu lanjut swapTokensForExactETH() cara awalnya sama validasi makesure path terakhir weth panggil amountsin lalu transfer ke pair pertama dan call function _swap stelah dapat withdraw weth  lalu transfer ethnya 

lanjut ke swapExactTokensForETH() caranya sama bedanya ini ambil getamountsout 

lanjut ke swapETHForExactTokens() pake getamountsin  lalu deposit eth lalutransfer weth ke pair pertama stelah itu panggil func swap 