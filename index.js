const { Client, LocalAuth  ,Buttons,List,MessageMedia} = require('whatsapp-web.js');
const mysql = require('mysql2/promise');
const qrcode = require('qrcode-terminal');  
const axios = require('axios');
const fs = require('fs');
require('path') 
let statusPesan = true  ;


const client = new Client({
    authStrategy: new LocalAuth(),
});


client.initialize();
client.on('authenticated', () => {
    console.log('Authenticated');
});

client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('Client is ready!');
});

client.on('message', async (message) => {
    if (message.body.startsWith("#DAFTAR#")) {
        statusPesan = true;
        var dataArray = message.body.split("#");

   
        var nama = dataArray[2];
        var tanggalLahir = dataArray[3].replace(/_/g, ":"); // Mengganti _ menjadi :

        var nik = dataArray[4];
        var nokk = dataArray[5];
        var isValid = true;
        if (nik.length < 16 || nokk.length < 16) {
            await client.sendMessage(
                message.from,
                "NIK atau No. KK kurang dari 16 digit"
            );
        }else{
             // Mengirim pesan konfirmasi dan menunggu balasan
        var confirmationMessage = `Apakah data Anda sudah benar? \n\nNama: ${nama}\nTanggal Lahir: ${tanggalLahir}\nNIK: ${nik}\nNo. KK: ${nokk}\n\nBalas YA atau TIDAK`;
        await client.sendMessage(message.from, confirmationMessage);
        let menuConfirmationPending = true;
        // Menunggu balasan konfirmasi dari pengguna
        client.on('message', async (confirmationResponse) => {
            // Memproses balasan konfirmasi
            if (menuConfirmationPending && confirmationResponse.body.toUpperCase() === "YA") {
                menuConfirmationPending = false;
                statusPesan = false;
                // Memasukkan data ke dalam tabel
                // Membuat koneksi ke database
                const connection = await mysql.createConnection({
                    host: 'localhost',
                    user: 'root',
                    password: '',
                    database: 'webapi',
                });

                const insertQuery = `INSERT INTO tabel_daftar (nama, tanggal_lahir, nik, nokk) VALUES (?, ?, ?, ?)`;
                const values = [nama, tanggalLahir, nik, nokk];

                try {
                    const [rows, fields] = await connection.execute(insertQuery, values);
                    console.log(`${rows.affectedRows} baris telah ditambahkan ke tabel.`);
                    await client.sendMessage(
                        message.from,
                        "Terima kasih, data Anda telah berhasil disimpan."
                    );
                } catch (error) {
                    console.log(error);
                    await client.sendMessage(
                        message.from,
                        "Maaf, terjadi kesalahan dalam menyimpan data Anda. Silakan coba lagi nanti."
                    );
                }

                // Menutup koneksi ke database
                await connection.end();
                statusPesan = false;
            } else if (confirmationResponse.body.toUpperCase() === "TIDAK") {
                menuConfirmationPending = false;
           
                await client.sendMessage(
                    message.from,
                    "Pendaftaran dibatalkan. Silakan ulangi proses pendaftaran."
                );
                statusPesan = false;
            }
        });
        }
       
    }else if (message.body.startsWith("#CUACA#")) {
        statusPesan = true;
        var dataArray = message.body.split("#");
      
        // Mengambil data dari pesan
        var lokasi = dataArray[2];
        var sublokasi = dataArray[3];
        
        // Membuat URL untuk mengakses API OpenWeatherMap
        var apikey = "5bb29f6f9c10737e0fb5fae86d250ad8";
        var url = `http://api.openweathermap.org/data/2.5/weather?q=${sublokasi},${lokasi}&appid=${apikey}&units=metric`;
      
        // Mengambil data cuaca dari API OpenWeatherMap
        try {
          var response = await axios.get(url);
          var weather = response.data.weather[0];
          var temperature = response.data.main.temp;
          var description = weather.description;
          var icon = weather.icon;
          var iconEmoji = getWeatherEmoji(icon);

          // Membuat pesan balasan
          var messageText = `Cuaca saat ini di ${sublokasi}, ${lokasi}: \n\n${description} \nSuhu: ${temperature}°C \n\nIcon: ${iconEmoji}`;
      
          // Mengirim pesan balasan
          await client.sendMessage(message.from, messageText);
          statusPesan = false;
        } catch (error) {
          // Menangani error saat mengambil data dari API
          console.log(error);
          await client.sendMessage(message.from, "Maaf, terjadi kesalahan dalam mengambil data cuaca.");
          statusPesan = false;
        }
      }
      else if(message.body.toLowerCase() == "menu"){
        const menu = 'List Menu: \n1. DAFTAR\n2. CUACA\n3. Al-Quran\n4. Dzikir\n\n PILIH MENU NO BERAPA YANG ANDA AKAN PILIH?';
        await client.sendMessage(message.from, menu)
    
        // Set a flag to indicate that a menu confirmation is pending
        let menuConfirmationPending = true;
    
        // Set up an event listener for incoming messages
        client.on('message', async (menuConfirm) => {
            statusPesan = true;
            // Check if a menu confirmation is pending and the incoming message is a valid option
            if (menuConfirmationPending && (menuConfirm.body === "1" || menuConfirm.body === "2"|| menuConfirm.body === "3" || menuConfirm.body === "4"  )) {
    
                // Reset the flag to indicate that the menu confirmation is complete
                menuConfirmationPending = false;
           
                // Handle the selected menu option
                if (menuConfirm.body.toUpperCase() === "1") {
                    await client.sendMessage(message.from, "FORMAT PENDAFTARAN ADALAH *#DAFTAR#NAMA LENGKAP#tahun_bulan_tanggal#NIK#NO.KK*");
                    statusPesan = false;
                } else if(menuConfirm.body.toUpperCase() === "2"){
                    await client.sendMessage(message.from, "FORMAT CHECK CUACA ADALAH *#CUACA#KOTA#SUBKOTA");
                    statusPesan = false;
                }else if(menuConfirm.body.toUpperCase() === "3"){
                    await client.sendMessage(message.from, "FORMAT QURAN ADALAH *surah nosurah \n\ncontoh: surah 112");
                    statusPesan = false;
                }else if(menuConfirm.body.toUpperCase() === "4"){
                    await client.sendMessage(message.from, "Ketik Dzikir");
                    statusPesan = false;
                }
        
            }
        });
    
        
    }else if (message.body.startsWith('surah') || message.body.startsWith('Surah')) {
        const surahNumber = message.body.split(' ')[1];
        try {
          const response = await axios({
            method: 'GET',
            url: `https://equran.id/api/v2/surat/${surahNumber}`,
            headers: {
              'Accept': 'application/json'
            }
          });
      
          const data = response.data.data;
          const ayat = data.ayat;
          var deskrip = '';
      
          let messageBody = `SURAH ${data.nama}\n\n`;
      
          for (let i = 0; i < ayat.length; i++) {
            deskrip += data.ayat[i].teksIndonesia;
            messageBody += `(${ayat[i].nomorAyat}) ${ayat[i].teksArab}\n\n`;
          }
          
          messageBody += `Artinya: ${deskrip}`;
          
      
          await client.sendMessage(message.from, 'Mohon tunggu sebentar, sedang mengirim audio...');
          
          const audioUrl = data.audioFull["05"];
          const audioResponse = await axios.get(audioUrl, { responseType: 'arraybuffer' });
          const audioBuffer = Buffer.from(audioResponse.data, 'binary');
          const audioBase64 = audioBuffer.toString('base64');
      
          const media = new MessageMedia('audio/mp3', audioBase64, `${data.namaLatin}.mp3`);
          await client.sendMessage(message.from,messageBody );
          await client.sendMessage(message.from, media, {sendMediaAsDocument: true });
      
      
      
        } catch (error) {
     console.log(error);
          await client.sendMessage(message.from, 'Surah tidak ditemukan.');
        }
      }
      else if (message.body.startsWith('dzikir')||  message.body.startsWith('Dzikir')) {
        await client.sendMessage(message.from, 'Mohon tunggu sebentar, sedang mengirim audio...');
     
        const audioPath = 'dzikir.mp3';
        // Membaca file audio sebagai binary buffer
        const audioBuffer = fs.readFileSync(audioPath);
        // Mengubah binary buffer menjadi base64 encoded string
        const base64EncodedAudio = audioBuffer.toString('base64');
        // Membuat instance MessageMedia dengan base64 encoded string
        const media = new MessageMedia('audio/mp3', base64EncodedAudio, 'dzikir.mp3');
        // Mengirim file audio sebagai dokumen dengan format mp3
        await client.sendMessage(message.from, media, { sendMediaAsDocument: true });
      }
            
      else{
        if (!statusPesan) {
            
            await client.sendMessage(message.from, "INPUT TIDAK DIKENAL KETIK MENU UNTUK PILIH MENU");
 
                  
    }
}
    
      
    
});

  
function getWeatherEmoji(icon) {
    switch (icon) {
      case "01d":
        return "☀️"; // matahari terbit
      case "01n":
        return "🌙"; // bulan
      case "02d":
      case "02n":
      case "03d":
      case "03n":
      case "04d":
      case "04n":
        return "☁️"; // awan
      case "09d":
      case "09n":
        return "🌧️"; // hujan
      case "10d":
      case "10n":
        return "🌦️"; // hujan dan matahari
      case "11d":
      case "11n":
        return "⛈️"; // petir
      case "13d":
      case "13n":
        return "❄️"; // salju
      case "50d":
      case "50n":
        return "🌫️"; // kabut
      default:
        return "";
    }
  }
  