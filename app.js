const firebaseConfig = {
    apiKey: "AIzaSyDMj4zxwsCHHmSKYVqm8356kE3KaFSMWoI",
    authDomain: "vampirkoylu-1.firebaseapp.com",
    databaseURL: "https://vampirkoylu-1-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "vampirkoylu-1",
    storageBucket: "vampirkoylu-1.firebasestorage.app",
    messagingSenderId: "175565854907",
    appId: "1:175565854907:web:118a22779343bd5ed0b19e"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let aktifOdaKodu = "";
let geceGecmisi = { kopyaci: null, vampir: null, doktor: null, buyucu: null, serif: null, alfaKullandi: false };
let geceAdimi = 0;
let mevcutOyuncular = {};
let odaKurallari = {};
let aktifTur = 1;
let rollerGizli = true; 
let sonGorulenRol = ""; 

const roleInfo = {
    "Vampir": { desc: "Gece uyanır ve birini avlar. Köylüleri bitirmeye çalışır.", pts: "Öldürdüğü her kişi için +2, oyunu kazanırsa +10." },
    "Alfa Vampir": { desc: "Vampirlerin lideridir. Oyunda 1 veya daha fazla kez öldürmek yerine hedefini Vampire dönüştürebilir.", pts: "Normal Vampir ile aynı." },
    "Doktor": { desc: "Gece uyanır ve birini seçer. O kişi vampir saldırısından korunur.", pts: "Başarılı kurtarış +3, Köylüler kazanırsa +10." },
    "Büyücü": { desc: "Gece bir kişiye bakar ve Vampir olup olmadığını öğrenir.", pts: "Vampir bulursa +3, Köylüler kazanırsa +10." },
    "Şerif": { desc: "Gece şüphelendiği birini vurabilir. Hedef Vampirse ölür, masumsa Şerif kendi ölür.", pts: "Doğru vuruş +5, Yanlış vuruş -5." },
    "İntikamcı": { desc: "Gündüz veya gece öldüğünde, son nefesinde masadan birini seçip yanında götürür.", pts: "Vampir/Soytarı götürürse +5, Köylü götürürse -5." },
    "Soytarı": { desc: "Tek amacı Gündüz oylamasında kendini astırmaktır. Asılırsa oyunu tek başına kazanır.", pts: "Asılırsa +25 puan!" },
    "Muhtar": { desc: "Gündüz oylamalarında oyu 2 sayılır. Ekstra canı yoktur.", pts: "Köylüler kazanırsa +10." },
    "Gazi": { desc: "Oyun boyunca 1 defaya mahsus Vampir saldırısından otomatik kurtulur.", pts: "Köylüler kazanırsa +10." },
    "Kopyacı": { desc: "Sadece 1. Gece uyanır ve bir hedef seçer. Hedefi öldüğünde, Kopyacı o role dönüşür.", pts: "Dönüştüğü rolün kurallarına göre puan alır." },
    "Hipnozcu": { desc: "Gündüz oylamasında oyları iptal edip seçtiği kişiyi zorla astırır. (1 Kez)", pts: "Vampir/Soytarı astırırsa +5, Masum astırırsa -5." },
    "Yargıç": { desc: "Gündüz biri asılacakken İtiraz edip idamı durdurur. (1 Kez)", pts: "Masumu kurtarırsa +5, Vampiri ipten alırsa -5." },
    "İstihbaratçı": { desc: "Gece uyanmaz. Ekranına A veya B kesin Vampir şeklinde doğru ipucu gelir.", pts: "Moderatör manuel puan verebilir." },
    "Lanetli": { desc: "Tamamen masumdur ama Büyücü ona bakarsa Büyücüye Vampir görünür.", pts: "Büyücü yüzünden asılırsa +3 Teselli puanı." }
};

function rolBilgisiGoster(rolAdi) {
    const info = roleInfo[rolAdi];
    if(info) {
        document.getElementById("info-role-title").innerText = rolAdi;
        document.getElementById("info-role-desc").innerText = info.desc;
        document.getElementById("info-role-points").innerText = info.pts;
        document.getElementById("settings-modal").style.display = "none";
        document.getElementById("role-info-modal").style.display = "flex";
    }
}

function bilgiEkraniniKapat() {
    document.getElementById("role-info-modal").style.display = 'none';
    document.getElementById("settings-modal").style.display = 'flex';
}

function ekranGoster(ekranId) {
    const ekranlar = ['main-menu', 'join-menu', 'mod-setup', 'mod-dashboard', 'game-screen'];
    ekranlar.forEach(id => document.getElementById(id).style.display = (id === ekranId) ? 'block' : 'none');
}
function pencereKapat(modalId) { document.getElementById(modalId).style.display = 'none'; }

window.onload = function() {
    const savedName = localStorage.getItem("playerName");
    const savedRoom = localStorage.getItem("roomCode");
    if (savedName && savedRoom) document.getElementById("btnContinue").style.display = "block";
    odalarıListele();
};

function oyunaDevamEt() {
    const name = localStorage.getItem("playerName");
    const room = localStorage.getItem("roomCode");
    if (name && room) oyuncuEkraniniHazirla(room, name);
}

function odalarıListele() {
    db.ref("odalar").on("value", snap => {
        const div = document.getElementById("room-list");
        div.innerHTML = "";
        let bulundu = false;
        if (snap.val()) {
            Object.keys(snap.val()).forEach(kod => {
                bulundu = true;
                div.innerHTML += `<div class="room-item" onclick="document.getElementById('roomCode').value='${kod}'"><span>Oda: ${kod}</span> <span>Katıl ➜</span></div>`;
            });
        }
        if(!bulundu) div.innerHTML = "<p>Açık oda yok.</p>";
    });
}

function oyunaKatil() {
    const name = document.getElementById("playerName").value.trim();
    const code = document.getElementById("roomCode").value.trim();
    if (!name || !code) return;
    localStorage.setItem("playerName", name);
    localStorage.setItem("roomCode", code);

    db.ref(`odalar/${code}/oyuncular/${name}`).update({
        isim: name, gosterilenIsim: name, rol: "Belirlenmedi", durum: "Onay Bekliyor", puan: 0
    }).then(() => oyuncuEkraniniHazirla(code, name));
}

function oyuncuEkraniniHazirla(code, name) {
    ekranGoster('game-screen');
    aktifOdaKodu = code; 
    
    db.ref(`odalar/${code}`).on("value", snap => {
        const oda = snap.val();
        if(oda) {
            mevcutOyuncular = oda.oyuncular || {}; 
            aktifTur = oda.tur || 1;
            document.getElementById("roundText").innerText = "Tur: " + aktifTur;
            document.getElementById("zamanText").innerText = oda.zaman || "Bekleniyor";
            
            const scoreBtn = document.getElementById("btn-player-score");
            scoreBtn.style.display = (oda.zaman === "Bekleme Salonu") ? "block" : "none";

            const data = mevcutOyuncular[name];
            if (data) {
                document.getElementById("welcomeText").innerText = "Hoş geldin, " + (data.gosterilenIsim || data.isim) + "!";
                
                const istBox = document.getElementById("istihbarat-box");
                if (data.ipucu && oda.zaman !== "Bekleme Salonu") {
                    document.getElementById("istihbaratText").innerText = data.ipucu;
                    istBox.style.display = "block";
                } else { istBox.style.display = "none"; }

                const donBox = document.getElementById("donusum-box");
                if (sonGorulenRol !== "" && data.rol !== "Belirlenmedi" && sonGorulenRol !== data.rol && data.durum === "Hayatta") {
                    donBox.style.display = "block";
                } else { donBox.style.display = "none"; }
                
                if(data.rol === "Belirlenmedi") sonGorulenRol = "";
                else if (sonGorulenRol === "") sonGorulenRol = data.rol;

                if(data.durum === "Onay Bekliyor") {
                    document.getElementById("statusText").innerText = "Moderatörün seni alması bekleniyor...";
                    document.getElementById("roleBox").style.display = "none";
                } else if(data.durum === "Ölü") {
                    document.getElementById("statusText").innerHTML = "<span style='color:red;'>ÖLDÜNÜZ!</span>";
                    document.getElementById("roleBox").style.display = "block";
                    document.getElementById("roleDisplay").innerText = data.rol;
                } else if(data.durum === "Pasif") {
                    document.getElementById("statusText").innerText = "Moderatör tarafından mola/pasife alındın.";
                } else if (data.rol !== "Belirlenmedi") {
                    document.getElementById("statusText").innerText = "Masadasın. Roller dağıtıldı!";
                    document.getElementById("roleBox").style.display = "block";
                    document.getElementById("roleDisplay").innerText = data.rol;
                } else {
                    document.getElementById("statusText").innerText = "Masadasın. Rol bekleniyor.";
                    document.getElementById("roleBox").style.display = "none";
                }
            } else { masadanKalk(); }
        }
    });
}

function masadanKalkOnay() {
    if(confirm("Masadan kalkmak istediğinize emin misiniz?")) { masadanKalk(); }
}
function masadanKalk() { localStorage.clear(); location.reload(); }

// --- MODERATÖR ---
function odaKur() {
    aktifOdaKodu = document.getElementById("modRoomCode").value.trim();
    if (!aktifOdaKodu) return;

    odaKurallari = {
        docSelfOnce: document.getElementById("doc-self-once")?.checked || true,
        docNoConsec: document.getElementById("doc-no-consecutive")?.checked || true,
        alfaLimit: parseInt(document.getElementById("alfa-limit")?.value) || 1,
        alfaKullanimSayisi: 0, hipnozKullandi: false, yargicKullandi: false,
        docGecmis: { sonSecilen: null, kendiSecimiKaldi: 1 }
    };

    db.ref(`odalar/${aktifOdaKodu}`).set({ tur: 0, zaman: "Bekleme Salonu", kurallar: odaKurallari }).then(() => {
        document.getElementById("dashRoomCode").innerText = aktifOdaKodu;
        ekranGoster('mod-dashboard');
        modPaneliniDinle();
    });
}

function ayarlarMenuGoster() { document.getElementById("settings-modal").style.display = "flex"; }
function ayarlariUygula() {
    odaKurallari.docSelfOnce = document.getElementById("doc-self-once").checked;
    odaKurallari.docNoConsec = document.getElementById("doc-no-consecutive").checked;
    odaKurallari.alfaLimit = parseInt(document.getElementById("alfa-limit").value) || 1;
    
    if(odaKurallari.docSelfOnce && !odaKurallari.docGecmis) odaKurallari.docGecmis = { sonSecilen: null, kendiSecimiKaldi: 1 };
    
    db.ref(`odalar/${aktifOdaKodu}/kurallar`).update(odaKurallari).then(() => {
        pencereKapat('settings-modal');
        alert("Ayarlar başarıyla kaydedildi!");
    });
}

function toggleRolGizle() {
    rollerGizli = !rollerGizli;
    document.getElementById("btnRolGizle").innerHTML = rollerGizli ? "👁️ Rolleri Göster" : "🙈 Rolleri Gizle";
    renderModPanel(); 
}

function modPaneliniDinle() {
    db.ref(`odalar/${aktifOdaKodu}`).off(); 
    db.ref(`odalar/${aktifOdaKodu}`).on("value", snap => {
        const oda = snap.val();
        if(!oda) return;
        mevcutOyuncular = oda.oyuncular || {};
        aktifTur = oda.tur || 1;
        if(oda.kurallar) odaKurallari = oda.kurallar;
        
        document.getElementById("modZamanText").innerText = oda.zaman;
        renderModPanel(); 
    });
}

function profilGoster(gercekIsim) {
    const data = mevcutOyuncular[gercekIsim];
    if(!data) return;
    
    document.getElementById("profile-gercek-isim").value = gercekIsim;
    document.getElementById("profile-display-name").value = data.gosterilenIsim || gercekIsim;
    
    let rolText = data.rol;
    if (data.rol === "Kopyacı" && data.kopyaciHedefi) rolText += ` (Hedef: ${data.kopyaciHedefi})`;
    document.getElementById("profileRoleDisplay").innerText = rolText;
    
    document.getElementById("player-profile-modal").style.display = "flex";
}

function profilIsminiKaydet() {
    const gercekIsim = document.getElementById("profile-gercek-isim").value;
    const yeniGosterilenIsim = document.getElementById("profile-display-name").value.trim();
    if(yeniGosterilenIsim === "") return alert("İsim boş olamaz");
    
    db.ref(`odalar/${aktifOdaKodu}/oyuncular/${gercekIsim}`).update({ gosterilenIsim: yeniGosterilenIsim }).then(() => {
        pencereKapat('player-profile-modal');
    });
}

function manuelPuan(miktar) {
    const gercekIsim = document.getElementById("profile-gercek-isim").value;
    const data = mevcutOyuncular[gercekIsim];
    if(!data) return;

    let yeniPuan = (data.puan || 0) + miktar;
    let mevcutTP = (data.turPuanlari && data.turPuanlari[`tur_${aktifTur}`]) ? data.turPuanlari[`tur_${aktifTur}`] : 0;
    
    db.ref(`odalar/${aktifOdaKodu}/oyuncular/${gercekIsim}`).update({
        puan: yeniPuan,
        [`turPuanlari/tur_${aktifTur}`]: mevcutTP + miktar
    }).then(() => {
        alert(`${data.gosterilenIsim || gercekIsim} oyuncusuna ${miktar} puan eklendi.`);
    });
}

// Bot ekleme (Sessizce ve anında veritabanına)
function botOyuncuEkle() { 
    if(!aktifOdaKodu) return alert("Önce odayı kurmalısınız!");
    const rand = Math.floor(Math.random()*1000);
    const botID = "Oyuncu " + rand; 
    db.ref(`odalar/${aktifOdaKodu}/oyuncular/${botID}`).set({ 
        isim: botID, gosterilenIsim: botID, rol: "Belirlenmedi", durum: "Hayatta", puan: 0, isBot: true 
    }); 
}

function renderModPanel() {
    const list = document.getElementById("player-list-mod");
    const approvalList = document.getElementById("approval-list");
    const approvalSec = document.getElementById("approval-section");
    
    list.innerHTML = ""; approvalList.innerHTML = "";
    let onayBekleyenVar = false; let canliSayisi = 0;

    Object.values(mevcutOyuncular).forEach(p => {
        let displayName = p.gosterilenIsim || p.isim;
        
        if(p.durum === "Onay Bekliyor") {
            onayBekleyenVar = true;
            approvalList.innerHTML += `
                <div class="approval-item">
                    <span>${displayName}</span>
                    <div>
                        <button onclick="oyuncuGuncelle('${p.isim}', 'durum', 'Hayatta')" style="background:#4caf50; padding:5px;">✔</button>
                        <button onclick="oyuncuSil('${p.isim}')" style="background:#ff4757; padding:5px;">✖</button>
                    </div>
                </div>`;
        } else {
            if (p.durum === "Hayatta") canliSayisi++;
            const sinif = p.durum === "Ölü" ? "olu" : (p.durum === "Pasif" ? "pasif" : "");
            
            let btnHtml = "";
            if(p.durum === "Hayatta" || p.durum === "Ölü") {
                btnHtml += `<button class="mini-btn" style="background:#e67e22;" onclick="event.stopPropagation(); oyuncuGuncelle('${p.isim}', 'durum', 'Pasif')">⏸</button>`;
            } else if(p.durum === "Pasif") {
                btnHtml += `<button class="mini-btn" style="background:#4caf50;" onclick="event.stopPropagation(); oyuncuGuncelle('${p.isim}', 'durum', 'Hayatta')">▶️</button>`;
            }
            btnHtml += `<button class="mini-btn" style="background:#c0392b;" onclick="event.stopPropagation(); if(confirm('${displayName} odadan atılsın mı?')) oyuncuSil('${p.isim}')">🗑</button>`;

            let gosterilecekRol = rollerGizli ? (p.rol === "Belirlenmedi" ? "Belirlenmedi" : "***") : p.rol;
            let gaziIkon = (p.gaziCani && !rollerGizli) ? ' (🛡️)' : '';

            list.innerHTML += `
                <div class="player-card ${sinif}" onclick="profilGoster('${p.isim}')">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <h4>${displayName}</h4>
                            <p>Rol: <b>${gosterilecekRol}</b>${gaziIkon}</p>
                            <p>Durum: ${p.durum}</p>
                        </div>
                        <div class="mini-btn-group" style="flex-direction: column;">${btnHtml}</div>
                    </div>
                </div>`;
        }
    });
    document.getElementById("oyuncuSayisi").innerText = canliSayisi;
    approvalSec.style.display = onayBekleyenVar ? "block" : "none";
}

function oyuncuGuncelle(isim, alan, deger) { db.ref(`odalar/${aktifOdaKodu}/oyuncular/${isim}`).update({ [alan]: deger }); }
function oyuncuSil(isim) { db.ref(`odalar/${aktifOdaKodu}/oyuncular/${isim}`).remove(); }

function oyunuKompleKapat() { 
    if(confirm("Odayı tamamen kapatırsan herkes atılır! Emin misin?")) {
        db.ref(`odalar/${aktifOdaKodu}`).remove().then(() => location.reload());
    }
}

function yedekle(tip) {
    db.ref(`odalar/${aktifOdaKodu}/oyuncular`).once('value').then(s => { db.ref(`odalar/${aktifOdaKodu}/yedek_${tip}`).set(s.val()); });
}
function geriAl(tip) {
    if(confirm("Son yapılan işlemi geri almak istediğine emin misin?")) {
        db.ref(`odalar/${aktifOdaKodu}/yedek_${tip}`).once('value').then(s => {
            if(s.val()) {
                db.ref(`odalar/${aktifOdaKodu}/oyuncular`).set(s.val());
                db.ref(`odalar/${aktifOdaKodu}`).update({ zaman: "Gündüz" });
                alert("Geri alındı!");
            } else alert("Geri alınacak bir veri yok!");
        });
    }
}

function turuBitirMenu() { document.getElementById("end-round-modal").style.display = "flex"; }
function oyunBittiIsle(sonucTip) {
    pencereKapat('end-round-modal');
    if(confirm("Puanlar yansıyacak ve oyuncular Bekleme Salonuna geçecek. Emin misin?")) {
        let guncellemeler = {};
        Object.keys(mevcutOyuncular).forEach(isim => {
            let p = mevcutOyuncular[isim];
            if(p && p.durum !== "Onay Bekliyor" && p.durum !== "Pasif") {
                guncellemeler[`oyuncular/${isim}/durum`] = "Hayatta";
                guncellemeler[`oyuncular/${isim}/eskiRol`] = p.rol; 
                guncellemeler[`oyuncular/${isim}/rol`] = "Belirlenmedi";
                guncellemeler[`oyuncular/${isim}/ipucu`] = null; 
                guncellemeler[`oyuncular/${isim}/kopyaciHedefi`] = null; 
                
                let kazanilan = 0;
                if(sonucTip === 1 && (p.rol === "Vampir" || p.rol === "Alfa Vampir")) kazanilan = 10;
                if(sonucTip === 2 && p.rol !== "Vampir" && p.rol !== "Alfa Vampir" && p.rol !== "Soytarı") kazanilan = 10;
                
                if(kazanilan > 0) {
                    guncellemeler[`oyuncular/${isim}/puan`] = (p.puan || 0) + kazanilan;
                    let mevcutTurPuani = (p.turPuanlari && p.turPuanlari[`tur_${aktifTur}`]) ? p.turPuanlari[`tur_${aktifTur}`] : 0;
                    guncellemeler[`oyuncular/${isim}/turPuanlari/tur_${aktifTur}`] = mevcutTurPuani + kazanilan;
                }
            }
        });
        
        guncellemeler["zaman"] = "Bekleme Salonu";
        guncellemeler["kurallar/hipnozKullandi"] = false;
        guncellemeler["kurallar/yargicKullandi"] = false;
        db.ref(`odalar/${aktifOdaKodu}`).update(guncellemeler).then(() => alert(sonucTip === 0 ? "Tur iptal edildi." : "Oyun bitti, puanlar yansıdı."));
    }
}

function rolleriKaristir(dizi) {
    let kopya = [...dizi];
    for (let i = kopya.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [kopya[i], kopya[j]] = [kopya[j], kopya[i]];
    }
    return kopya;
}

function yeniTurBaslat() {
    if(confirm("Yeni rolleri dağıtıp turu başlatmak istediğine emin misin?")) {
        yedekle('tur_basi'); 
        
        let aktifler = Object.keys(mevcutOyuncular).filter(k => mevcutOyuncular[k] && (mevcutOyuncular[k].durum === "Hayatta" || mevcutOyuncular[k].durum === "Ölü"));
        let roller = [];
        
        const count = (id) => parseInt(document.getElementById(id)?.value) || 0;
        for(let i=0; i<count("dash-vampire"); i++) roller.push("Vampir");
        for(let i=0; i<count("dash-alpha"); i++) roller.push("Alfa Vampir");
        for(let i=0; i<count("dash-doctor"); i++) roller.push("Doktor");
        for(let i=0; i<count("dash-seer"); i++) roller.push("Büyücü");
        for(let i=0; i<count("dash-sheriff"); i++) roller.push("Şerif");
        for(let i=0; i<count("dash-avenger"); i++) roller.push("İntikamcı");
        for(let i=0; i<count("dash-jester"); i++) roller.push("Soytarı");
        for(let i=0; i<count("dash-mayor"); i++) roller.push("Muhtar");
        for(let i=0; i<count("dash-veteran"); i++) roller.push("Gazi");
        for(let i=0; i<count("dash-doppel"); i++) roller.push("Kopyacı");
        for(let i=0; i<count("dash-hypno"); i++) roller.push("Hipnozcu");
        for(let i=0; i<count("dash-judge"); i++) roller.push("Yargıç");
        for(let i=0; i<count("dash-gossip"); i++) roller.push("İstihbaratçı");
        for(let i=0; i<count("dash-cursed"); i++) roller.push("Lanetli");

        while(roller.length < aktifler.length) roller.push("Köylü");
        
        aktifler = rolleriKaristir(aktifler);
        roller = rolleriKaristir(roller.slice(0, aktifler.length));

        let guncellemeler = {};
        let istihbaratciVar = false;
        let vampirListesi = [];
        let masumListesi = [];

        aktifler.forEach((isim, idx) => {
            let atananRol = roller[idx];
            guncellemeler[`oyuncular/${isim}/rol`] = atananRol;
            guncellemeler[`oyuncular/${isim}/durum`] = "Hayatta";
            guncellemeler[`oyuncular/${isim}/ipucu`] = null; 
            if(atananRol === "Gazi") guncellemeler[`oyuncular/${isim}/gaziCani`] = 1; 
            
            if(atananRol === "İstihbaratçı") istihbaratciVar = true;
            if(atananRol.includes("Vampir")) vampirListesi.push(isim);
            else if (atananRol !== "Soytarı") masumListesi.push(isim);
        });
        
        if(istihbaratciVar && vampirListesi.length > 0 && masumListesi.length > 0) {
            let v = vampirListesi[Math.floor(Math.random() * vampirListesi.length)];
            let m = masumListesi[Math.floor(Math.random() * masumListesi.length)];
            let isimler = rolleriKaristir([v, m]); 
            
            let dV = mevcutOyuncular[isimler[0]]?.gosterilenIsim || isimler[0];
            let dM = mevcutOyuncular[isimler[1]]?.gosterilenIsim || isimler[1];
            let ipucuText = `Şüpheli Hareketler: ${dV} veya ${dM} ikilisinden biri kesinlikle VAMPİR!`;
            
            aktifler.forEach((isim, idx) => {
                if(roller[idx] === "İstihbaratçı") guncellemeler[`oyuncular/${isim}/ipucu`] = ipucuText;
            });
        }
        
        db.ref(`odalar/${aktifOdaKodu}`).once("value").then(s => {
            guncellemeler["tur"] = (s.val().tur || 0) + 1;
            guncellemeler["zaman"] = "Gündüz";
            db.ref(`odalar/${aktifOdaKodu}`).update(guncellemeler);
        });
        document.getElementById("btnGece").style.display = "block";
        document.getElementById("btnOylama").style.display = "block";
    }
}

function geceyiBaslat() {
    yedekle('son_islem');
    db.ref(`odalar/${aktifOdaKodu}`).update({ zaman: "Gece" });
    geceGecmisi = { kopyaci: null, vampir: null, doktor: null, buyucu: null, serif: null, alfaKullandi: false };
    geceAdimi = 0; 
    geceModalGoster();
}

function geceModalGoster() {
    const modal = document.getElementById("action-modal");
    const list = document.getElementById("action-list");
    const title = document.getElementById("action-title");
    const desc = document.getElementById("action-desc");
    const alphaArea = document.getElementById("alpha-area");
    
    const alphaCheckbox = document.getElementById("alpha-convert");
    if(alphaCheckbox) alphaCheckbox.checked = false; 

    list.innerHTML = ""; alphaArea.style.display = "none";
    document.getElementById("btn-action-pass").style.display = "none"; 
    
    let hayattakiler = Object.values(mevcutOyuncular).filter(p => p && p.durum === "Hayatta");

    if (geceAdimi === 0) {
        let kopyaciVar = hayattakiler.some(p => p.rol === "Kopyacı" && !p.kopyaciHedefi);
        if(aktifTur === 1 && kopyaciVar) {
            title.innerText = "🎭 Kopyacı Seçimi"; desc.innerText = "Kimi kopyalayacak?";
            hayattakiler.forEach(p => {
                let dName = p.gosterilenIsim || p.isim;
                if(p.rol !== "Kopyacı") list.innerHTML += `<button class="modal-item-btn" onclick="geceSonrakiAdim('${p.isim}')">${dName}</button>`;
            });
            modal.style.display = "flex";
            return;
        } else { geceAdimi = 1; }
    }

    modal.style.display = "flex";

    if (geceAdimi === 1) {
        title.innerText = "🩸 Vampir Seçimi"; desc.innerText = "Vampirler kimi avlıyor?";
        let vampirVar = hayattakiler.some(p => p.rol.includes("Vampir"));
        let alfaOyundaVarmi = Object.values(mevcutOyuncular).some(p => p && (p.rol === "Alfa Vampir" || p.eskiRol === "Alfa Vampir"));
        let kullanimSayisi = odaKurallari.alfaKullanimSayisi || 0;
        let limit = odaKurallari.alfaLimit || 1;
        
        if(vampirVar && alfaOyundaVarmi && kullanimSayisi < limit) {
            alphaArea.style.display = "block";
        }

        hayattakiler.forEach(p => {
            let dName = p.gosterilenIsim || p.isim;
            if(!p.rol.includes("Vampir")) list.innerHTML += `<button class="modal-item-btn" onclick="geceSonrakiAdim('${p.isim}')">${dName} (${p.rol})</button>`;
        });
    } else if (geceAdimi === 2) {
        title.innerText = "⚕️ Doktor Seçimi"; desc.innerText = "Doktor kimi koruyacak?"; 
        document.getElementById("btn-action-pass").style.display = "block";
        hayattakiler.forEach(p => {
            let dName = p.gosterilenIsim || p.isim;
            let yasakMi = false;
            if(odaKurallari.docNoConsec && odaKurallari.docGecmis?.sonSecilen === p.isim) yasakMi = true;
            if(odaKurallari.docSelfOnce && p.rol === "Doktor" && odaKurallari.docGecmis?.kendiSecimiKaldi <= 0 && p.isim === p.isim) yasakMi = true;
            if(!yasakMi) list.innerHTML += `<button class="modal-item-btn" onclick="geceSonrakiAdim('${p.isim}')">${dName} (${p.rol})</button>`;
        });
    } else if (geceAdimi === 3) {
        title.innerText = "🔮 Büyücü Seçimi"; desc.innerText = "Kime bakıyor?"; 
        document.getElementById("btn-action-pass").style.display = "block";
        hayattakiler.forEach(p => { let dName = p.gosterilenIsim || p.isim; if(p.rol !== "Büyücü") list.innerHTML += `<button class="modal-item-btn" onclick="geceSonrakiAdim('${p.isim}')">${dName}</button>`; });
    } else if (geceAdimi === 4) {
        title.innerText = "🔫 Şerif Seçimi"; desc.innerText = "Kimi vuracak? (Yanlışsa ölür)"; 
        document.getElementById("btn-action-pass").style.display = "block";
        hayattakiler.forEach(p => { let dName = p.gosterilenIsim || p.isim; if(p.rol !== "Şerif") list.innerHTML += `<button class="modal-item-btn" onclick="geceSonrakiAdim('${p.isim}')">${dName}</button>`; });
    }
}

function geceSonrakiAdim(secilenIsim) {
    if (geceAdimi === 0) geceGecmisi.kopyaci = secilenIsim;
    else if (geceAdimi === 1) {
        geceGecmisi.vampir = secilenIsim;
        if(document.getElementById("alpha-convert")?.checked) geceGecmisi.alfaKullandi = true;
    }
    else if (geceAdimi === 2) geceGecmisi.doktor = secilenIsim;
    else if (geceAdimi === 3) geceGecmisi.buyucu = secilenIsim;
    else if (geceAdimi === 4) geceGecmisi.serif = secilenIsim;

    geceAdimi++;
    if (geceAdimi > 4) geceyiBitirVeHesapla(); else geceModalGoster();
}

function kopyaciKontrolEt(olenIsimler, guncellemeler) {
    Object.values(mevcutOyuncular).forEach(p => {
        if(p && p.rol === "Kopyacı" && p.kopyaciHedefi && p.durum === "Hayatta") {
            if(olenIsimler.includes(p.kopyaciHedefi)) {
                let hedefinRolu = mevcutOyuncular[p.kopyaciHedefi].rol;
                guncellemeler[`oyuncular/${p.isim}/rol`] = hedefinRolu;
                alert(`🎭 KOPYACI DÖNÜŞTÜ! Kopyacının hedefi öldü. Kopyacı artık: ${hedefinRolu}`);
            }
        }
    });
}

function geceyiBitirVeHesapla() {
    pencereKapat('action-modal');
    let olenler = []; let guncellemeler = {}; let intikamciOlduMu = null;
    let artislar = {}; let olenGosterilenler = []; 

    const getRole = (isim) => mevcutOyuncular[isim] ? mevcutOyuncular[isim].rol : null;
    const getName = (isim) => mevcutOyuncular[isim] ? (mevcutOyuncular[isim].gosterilenIsim || isim) : isim;
    const addScore = (isim, p) => { artislar[isim] = (artislar[isim] || 0) + p; }

    if(geceGecmisi.kopyaci) {
        Object.values(mevcutOyuncular).filter(p=>p && p.rol==="Kopyacı").forEach(k => {
            guncellemeler[`oyuncular/${k.isim}/kopyaciHedefi`] = geceGecmisi.kopyaci;
        });
    }

    if (geceGecmisi.serif) {
        let hRol = getRole(geceGecmisi.serif);
        if (hRol.includes("Vampir") || hRol === "Soytarı") {
            olenler.push(geceGecmisi.serif); 
            olenGosterilenler.push(getName(geceGecmisi.serif));
            Object.values(mevcutOyuncular).filter(p=>p && p.rol==="Şerif").forEach(s => addScore(s.isim, 5)); 
        } else {
            Object.values(mevcutOyuncular).filter(p=>p && p.rol==="Şerif" && p.durum==="Hayatta").forEach(s => { 
                olenler.push(s.isim); olenGosterilenler.push(getName(s.isim)); addScore(s.isim, -5); 
            });
        }
    }

    if (geceGecmisi.buyucu) {
        let hRol = getRole(geceGecmisi.buyucu);
        if(hRol.includes("Vampir") || hRol === "Lanetli") {
            Object.values(mevcutOyuncular).filter(p=>p && p.rol==="Büyücü").forEach(b => addScore(b.isim, 3));
            alert("🔮 Büyücü vampiri buldu! (Ya da Lanetli'ye denk geldi...)");
        } else alert("Büyücü vampiri bulamadı.");
    }

    if (geceGecmisi.vampir) {
        let vHedef = geceGecmisi.vampir;
        if(geceGecmisi.doktor) {
            guncellemeler["kurallar/docGecmis/sonSecilen"] = geceGecmisi.doktor;
            if(getRole(geceGecmisi.doktor) === "Doktor" && geceGecmisi.doktor === vHedef) {
                 guncellemeler["kurallar/docGecmis/kendiSecimiKaldi"] = (odaKurallari.docGecmis?.kendiSecimiKaldi || 1) - 1;
            }
        }

        if (geceGecmisi.alfaKullandi) {
            alert(`🧛 Alfa Yeteneği Kullanıldı! ${getName(vHedef)} artık bir Vampir!`);
            guncellemeler[`oyuncular/${vHedef}/rol`] = "Vampir";
            guncellemeler["kurallar/alfaKullanimSayisi"] = (odaKurallari.alfaKullanimSayisi || 0) + 1;
            kopyaciKontrolEt([vHedef], guncellemeler); 
        } else {
            if (vHedef === geceGecmisi.doktor) {
                Object.values(mevcutOyuncular).filter(p=>p && p.rol==="Doktor").forEach(d => addScore(d.isim, 3));
            } else {
                if(getRole(vHedef) === "Gazi" && mevcutOyuncular[vHedef].gaziCani > 0) {
                    alert(`🛡️ Gazi saldırıya uğradı ama hayatta kaldı! (Zırhı kırıldı)`);
                    guncellemeler[`oyuncular/${vHedef}/gaziCani`] = 0;
                } else {
                    if(!olenler.includes(vHedef)) { olenler.push(vHedef); olenGosterilenler.push(getName(vHedef)); }
                    Object.values(mevcutOyuncular).filter(p=>p && p.rol.includes("Vampir") && p.durum==="Hayatta").forEach(v => addScore(v.isim, 2));
                }
            }
        }
    }

    Object.keys(artislar).forEach(isim => {
        let artis = artislar[isim];
        guncellemeler[`oyuncular/${isim}/puan`] = (mevcutOyuncular[isim].puan || 0) + artis;
        let mevcutTP = (mevcutOyuncular[isim].turPuanlari && mevcutOyuncular[isim].turPuanlari[`tur_${aktifTur}`]) ? mevcutOyuncular[isim].turPuanlari[`tur_${aktifTur}`] : 0;
        guncellemeler[`oyuncular/${isim}/turPuanlari/tur_${aktifTur}`] = mevcutTP + artis;
    });

    olenler.forEach(isim => {
        guncellemeler[`oyuncular/${isim}/durum`] = "Ölü";
        if(getRole(isim) === "İntikamcı") intikamciOlduMu = isim;
    });

    kopyaciKontrolEt(olenler, guncellemeler); 

    guncellemeler["zaman"] = "Gündüz";
    db.ref(`odalar/${aktifOdaKodu}`).update(guncellemeler).then(() => {
        alert(olenGosterilenler.length > 0 ? "Gece ölenler: " + olenGosterilenler.join(", ") : "Gece kimse ölmedi.");
        if(intikamciOlduMu) intikamciArayuzuGoster();
    });
}

function oylamaBaslat() {
    yedekle('son_islem');
    document.getElementById("chk-hipnoz").checked = false;
    document.getElementById("chk-yargic").checked = false;
    
    document.getElementById("chk-hipnoz").parentElement.style.display = odaKurallari.hipnozKullandi ? "none" : "block";
    document.getElementById("chk-yargic").parentElement.style.display = odaKurallari.yargicKullandi ? "none" : "inline-block";

    const list = document.getElementById("vote-list"); list.innerHTML = "";
    Object.values(mevcutOyuncular).filter(p => p && p.durum === "Hayatta").forEach(p => {
        let dName = p.gosterilenIsim || p.isim;
        list.innerHTML += `<button class="modal-item-btn" onclick="oylamaBitti('${p.isim}')">${dName} (${p.rol})</button>`;
    });
    document.getElementById("vote-modal").style.display = "flex";
}

function oylamaBitti(asilanIsim) {
    pencereKapat('vote-modal');
    if(!asilanIsim) return alert("Oylama pas geçildi.");

    let p = mevcutOyuncular[asilanIsim];
    let rol = p.rol;
    let dName = p.gosterilenIsim || p.isim;
    let guncellemeler = {};
    let artislar = {};
    const addScore = (isim, pts) => { artislar[isim] = (artislar[isim] || 0) + pts; }

    let hipnozVar = document.getElementById("chk-hipnoz").checked;
    let yargicVar = document.getElementById("chk-yargic").checked;

    if(hipnozVar) guncellemeler["kurallar/hipnozKullandi"] = true;
    if(yargicVar) guncellemeler["kurallar/yargicKullandi"] = true;

    if (yargicVar) {
        alert(`⚖️ YARGIÇ İTİRAZ ETTİ! ${dName} idamdan kurtuldu.`);
        Object.values(mevcutOyuncular).filter(oyuncu=>oyuncu && oyuncu.rol==="Yargıç").forEach(y => {
            if(rol.includes("Vampir") || rol === "Soytarı") addScore(y.isim, -5); 
            else addScore(y.isim, 5); 
        });
    } 
    else {
        guncellemeler[`oyuncular/${asilanIsim}/durum`] = "Ölü";

        if(rol === "Lanetli") addScore(asilanIsim, 3);

        if (hipnozVar) {
            Object.values(mevcutOyuncular).filter(oyuncu=>oyuncu && oyuncu.rol==="Hipnozcu").forEach(h => {
                if(rol.includes("Vampir") || rol === "Soytarı") addScore(h.isim, 5); 
                else addScore(h.isim, -5); 
            });
            alert(`🌀 HİPNOZCU KULLANILDI! Tüm oylar iptal edildi, ${dName} zorla asıldı.`);
        }

        if(rol === "Soytarı") { 
            addScore(asilanIsim, 25);
            alert("SOYTARI ASILDI! Lütfen Turu Bitir seçeneklerinden Normal Turu Bitir'e tıklayın.");
        }
    }

    Object.keys(artislar).forEach(isim => {
        let artis = artislar[isim];
        guncellemeler[`oyuncular/${isim}/puan`] = (mevcutOyuncular[isim].puan || 0) + artis;
        let mevcutTP = (mevcutOyuncular[isim].turPuanlari && mevcutOyuncular[isim].turPuanlari[`tur_${aktifTur}`]) ? mevcutOyuncular[isim].turPuanlari[`tur_${aktifTur}`] : 0;
        guncellemeler[`oyuncular/${isim}/turPuanlari/tur_${aktifTur}`] = mevcutTP + artis;
    });

    if(!yargicVar) kopyaciKontrolEt([asilanIsim], guncellemeler);

    db.ref(`odalar/${aktifOdaKodu}`).update(guncellemeler).then(() => {
        if(!yargicVar && rol === "İntikamcı") intikamciArayuzuGoster();
    });
}

function intikamciArayuzuGoster() {
    const list = document.getElementById("avenger-list"); list.innerHTML = "";
    Object.values(mevcutOyuncular).filter(p => p && p.durum === "Hayatta").forEach(p => {
        let dName = p.gosterilenIsim || p.isim;
        list.innerHTML += `<button class="modal-item-btn" onclick="intikamciVurdu('${p.isim}')">${dName}</button>`;
    });
    document.getElementById("avenger-modal").style.display = "flex";
}
function intikamciPas() { pencereKapat('avenger-modal'); }

function intikamciVurdu(hedefIsim) {
    pencereKapat('avenger-modal');
    let hedefRol = mevcutOyuncular[hedefIsim].rol;
    let dusmanMi = hedefRol.includes("Vampir") || hedefRol === "Soytarı";
    let intikamciPuan = dusmanMi ? 5 : -5;
    
    let guncellemeler = { [`oyuncular/${hedefIsim}/durum`]: "Ölü" };
    
    Object.values(mevcutOyuncular).filter(p=>p && p.rol==="İntikamcı").forEach(i => {
        guncellemeler[`oyuncular/${i.isim}/puan`] = (i.puan || 0) + intikamciPuan;
        let mevcutP = i.turPuanlari && i.turPuanlari[`tur_${aktifTur}`] ? i.turPuanlari[`tur_${aktifTur}`] : 0;
        guncellemeler[`oyuncular/${i.isim}/turPuanlari/tur_${aktifTur}`] = mevcutP + intikamciPuan;
    });

    kopyaciKontrolEt([hedefIsim], guncellemeler);

    db.ref(`odalar/${aktifOdaKodu}`).update(guncellemeler).then(() => {
        let dName = mevcutOyuncular[hedefIsim].gosterilenIsim || hedefIsim;
        alert(`İntikamcı ${dName} adlı kişiyi yanında götürdü!`);
    });
}

function skorTablosuGoster() {
    const list = document.getElementById("score-list"); 
    list.innerHTML = "";
    
    let butunTurlar = new Set();
    let siraliOyuncular = Object.values(mevcutOyuncular).filter(p => p).sort((a,b) => (b.puan||0) - (a.puan||0));
    
    siraliOyuncular.forEach(p => {
        if(p.turPuanlari) Object.keys(p.turPuanlari).forEach(k => butunTurlar.add(k));
    });

    let turListesi = Array.from(butunTurlar).sort((a, b) => parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]));

    if(turListesi.length === 0) {
        list.innerHTML = "<p>Henüz kimse puan kazanmamış.</p>";
    } else {
        let html = `<div style="overflow-x:auto;"><table class="score-table"><thead><tr><th>Oyuncu</th>`;
        turListesi.forEach(t => { html += `<th>${t.split('_')[1]}. Tur</th>`; });
        html += `<th>Toplam</th></tr></thead><tbody>`;

        siraliOyuncular.forEach(p => {
            let dName = p.gosterilenIsim || p.isim;
            html += `<tr><td style="text-align:left;"><b>${dName}</b></td>`;
            turListesi.forEach(t => {
                let turPuani = p.turPuanlari ? (p.turPuanlari[t] || 0) : 0;
                html += `<td>${turPuani}</td>`;
            });
            html += `<td><b style="color:#f9d342; font-size:16px;">${p.puan||0}</b></td></tr>`;
        });
        html += `</tbody></table></div>`;
        list.innerHTML = html;
    }

    document.getElementById("score-modal").style.display = "flex";
}

const viewBtn = document.getElementById("viewRoleBtn");
const roleDisplay = document.getElementById("roleDisplay");
viewBtn.addEventListener("mousedown", () => roleDisplay.style.display = "block");
viewBtn.addEventListener("touchstart", () => roleDisplay.style.display = "block");
viewBtn.addEventListener("mouseup", () => roleDisplay.style.display = "none");
viewBtn.addEventListener("touchend", () => roleDisplay.style.display = "none");

const profileViewBtn = document.getElementById("profileViewRoleBtn");
const profileRoleDisplay = document.getElementById("profileRoleDisplay");
profileViewBtn.addEventListener("mousedown", () => profileRoleDisplay.style.display = "block");
profileViewBtn.addEventListener("touchstart", () => profileRoleDisplay.style.display = "block");
profileViewBtn.addEventListener("mouseup", () => profileRoleDisplay.style.display = "none");
profileViewBtn.addEventListener("touchend", () => profileRoleDisplay.style.display = "none");