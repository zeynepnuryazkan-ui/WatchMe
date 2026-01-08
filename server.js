const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('.'));

// VERİ DEPOLARI
let videolar = []; // Videoları, linkleri ve yazar e-postalarını tutar
let raporlar = []; // Şikayetleri tutar

// Video Yükleme (E-posta ile beraber)
// Gelen videoları, linkleri ve yazar e-postalarını tutacak ana liste
let videolar = []; 
let raporlar = []; 

// YAZAR KAYDI: Artık email bilgisini de alıyoruz
app.post('/video-yukle', (req, res) => {
    const yeniVideo = {
        isim: req.body.isim,
        link: req.body.link,
        email: req.body.email // Yazardan gelen mail adresi
    };
    videolar.push(yeniVideo);
    res.status(200).send("Video Başarıyla Yüklendi");
});

// VİDEO DETAYI: İzleyici sayfası için mail bilgisini de gönderiyoruz
app.get('/video-detay', (req, res) => {
    const video = videolar.find(v => v.isim === req.query.id);
    res.json(video || {});
});

// RAPOR ETME: Şikayetleri listeye ekler
app.post('/rapor-et', (req, res) => {
    raporlar.push({
        video: req.body.video,
        sebep: req.body.sebep,
        tarih: new Date().toLocaleString()
    });
    res.status(200).send("Şikayet Alındı");
});
// Yeni hali (İnternet uyumlu):
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log(`🚀 Watch Me yayında: Port ${PORT}`));
<script>
    async function raporlariYukle() {
        // Sayfa açılır açılmaz şifre sorar
        const sifre = prompt("Lütfen Admin Şifresini Giriniz:");
        
        const response = await fetch(`/admin-verileri?sifre=${sifre}`);
        
        if (response.status === 401) {
            alert("Hatalı şifre! Sayfaya erişim reddedildi.");
            window.location.href = "index.html"; // Yanlış şifrede ana sayfaya atar
            return;
        }

        const raporlar = await response.json();
        const liste = document.getElementById('raporListesi');
        
        if (raporlar.length === 0) {
            liste.innerHTML = "<li>Henüz raporlanmış bir video yok.</li>";
            return;
        }

        liste.innerHTML = raporlar.map(r => `
            <li style="background: #222; margin-bottom: 10px; padding: 15px; border-left: 5px solid red;">
                <strong>Video:</strong> ${r.video} <br>
                <strong>Sebep:</strong> ${r.sebep} <br>
                <small>Tarih: ${r.tarih}</small>
            </li>
        `).join('');
    }

    raporlariYukle();
</script>
app.get('/admin-verileri', (req, res) => {
    const gelenSifre = req.query.sifre;
    const GERCEK_SIFRE = "admin123"; // Şifren bu!

    if (gelenSifre === GERCEK_SIFRE) {
        res.json(raporlar);
    } else {
        res.status(401).send("Yetkisiz erişim!");
    }
});

let raporlar = []; // Şikayetlerin tutulacağı liste

app.post('/rapor-et', (req, res) => {
    const yeniRapor = {
        video: req.body.video,
        sebep: req.body.sebep,
        tarih: new Date().toLocaleString()
    };
    raporlar.push(yeniRapor);
    console.log("Yeni Rapor Geldi:", yeniRapor);
    res.status(200).send("Başarılı");
});


