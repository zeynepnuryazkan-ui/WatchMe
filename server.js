const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('.'));

// VERİ DEPOLARI
let videolar = [];
let raporlar = [];

// --- ANA YÖNLENDİRME ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// --- KAYIT MODÜLÜ ---
app.post('/kayit', (req, res) => {
    const { user, pass } = req.body;
    fs.appendFileSync('kullanicilar.txt', `Kullanıcı: ${user}, Şifre: ${pass}\n`);
    res.send({ mesaj: "Başarıyla giriş yapıldı!" });
});

// --- YAZAR MODÜLÜ (VİDEO YÜKLEME) ---
app.post('/video-yukle', (req, res) => {
    const yeniVideo = { id: videolar.length + 1, ...req.body, tarih: new Date().toLocaleString() };
    videolar.push(yeniVideo);
    res.send({ mesaj: "Tanıtım yayına alındı!" });
});

app.get('/videolari-listele', (req, res) => res.json(videolar));

// --- GÜVENLİK MODÜLÜ (REPORT) ---
app.post('/sikayet-et', (req, res) => {
    raporlar.push({ ...req.body, tarih: new Date().toLocaleString() });
    res.send({ mesaj: "Rapor admine iletildi." });
});

app.get('/admin-verileri', (req, res) => res.json(raporlar));
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
