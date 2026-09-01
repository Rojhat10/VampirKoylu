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
let geceGecmisi = { vampir: null, doktor: null, buyucu: null, serif: null, alfaKullandi: false };
let geceAdimi = 0;
let mevcutOyuncular = {};
let odaKurallari = {};
let aktifTur = 1;
let rollerGizli = true; // Moderatör ekranında roller varsayılan olarak gizli

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
        isim: name, rol: "Belirlenmedi", durum: "Onay Bekliyor", puan: 0
    }).then(() => oyuncuEkraniniHazirla(code, name));
}

function oyuncuEkraniniHazirla(code, name) {
    ekranGoster('game-screen');
    document.getElementById("welcomeText").innerText = "Hoş geldin, " + name + "!";
    aktifOdaKodu = code; // Skor tablosu için odayı globalde tutalım
    
    // Hem oyuncunun kendi bilgisini hem de oda verilerini dinliyoruz
    db.ref(`odalar/${code}`).on("value", snap => {
        const oda = snap.val();
        if(oda) {
            mevcutOyuncular = oda.oyuncular || {}; // Puan tablosu oluşturmak için lazım
            aktifTur = oda.tur || 1;
            document.getElementById("roundText").innerText = "Tur: " + aktifTur;
            document.getElementById("zamanText").innerText = oda.zaman || "Bekleniyor";
            document.body.style.backgroundColor = (oda.zaman === "Gece") ? "#000000" : "#1a1a2e";
            
            const data = mevcutOyuncular[name];
            if (data) {
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
            } else {
                masadanKalk(); // Eğer mod sildiyse
            }
        }
    });
}
function masadanKalk() { localStorage.clear(); location.reload(); }

// --- MODERATÖR İŞLEMLERİ ---
function odaKur() {
    aktifOdaKodu = document.getElementById("modRoomCode").value.trim();
    if (!aktifOdaKodu) return;

    odaKurallari = {
        docSelfOnce: document.getElementById("doc-self-once").checked,
        docNoConsec: document.getElementById("doc-no-consecutive").checked,
        docGecmis: { sonSecilen: null, kendiSecimiKaldi: document.getElementById("doc-self-once").checked ? 1 : 99 }
    };

    db.ref(`odalar/${aktifOdaKodu}`).set({ tur: 0, zaman: "Bekleme Salonu", kurallar: odaKurallari }).then(() => {
        document.getElementById("dashRoomCode").innerText = aktifOdaKodu;
        ekranGoster('mod-dashboard');
        modPaneliniDinle();
    });
}

function toggleRolGizle() {
    rollerGizli = !rollerGizli;
    document.getElementById("btnRolGizle").innerHTML = rollerGizli ? "👁️ Rolleri Göster" : "🙈 Rolleri Gizle";
    renderModPanel(); // Paneli hemen yeniden çiz
}

function modPaneliniDinle() {
    db.ref(`odalar/${aktifOdaKodu}`).on("value", snap => {
        const oda = snap.val();
        if(!oda) return;
        mevcutOyuncular = oda.oyuncular || {};
        aktifTur = oda.tur || 1;
        if(oda.kurallar) odaKurallari = oda.kurallar;
        
        document.getElementById("modZamanText").innerText = oda.zaman;
        renderModPanel(); // UI Çizimini ayrı bir fonksiyona aldık
    });
}

function renderModPanel() {
    const list = document.getElementById("player-list-mod");
    const approvalList = document.getElementById("approval-list");
    const approvalSec = document.getElementById("approval-section");
    
    list.innerHTML = ""; approvalList.innerHTML = "";
    let onayBekleyenVar = false; let canliSayisi = 0;

    Object.values(mevcutOyuncular).forEach(p => {
        if(p.durum === "Onay Bekliyor") {
            onayBekleyenVar = true;
            approvalList.innerHTML += `
                <div class="approval-item">
                    <span>${p.isim}</span>
                    <div>
                        <button onclick="oyuncuGuncelle('${p.isim}', 'durum', 'Hayatta')" style="background:#4caf50; padding:5px;">✔ Al</button>
                        <button onclick="oyuncuSil('${p.isim}')" style="background:#ff4757; padding:5px;">✖ Sil</button>
                    </div>
                </div>`;
        } else {
            if (p.durum === "Hayatta") canliSayisi++;
            const sinif = p.durum === "Ölü" ? "olu" : (p.durum === "Pasif" ? "pasif" : "");
            
            // Mini Kontrol Butonları
            let btnHtml = "";
            if(p.durum === "Hayatta" || p.durum === "Ölü") {
                btnHtml += `<button class="mini-btn" style="background:#e67e22;" onclick="oyuncuGuncelle('${p.isim}', 'durum', 'Pasif')">⏸ Pasife Al</button>`;
            } else if(p.durum === "Pasif") {
                btnHtml += `<button class="mini-btn" style="background:#4caf50;" onclick="oyuncuGuncelle('${p.isim}', 'durum', 'Hayatta')">▶️ Aktif Et</button>`;
            }
            btnHtml += `<button class="mini-btn" style="background:#c0392b;" onclick="if(confirm('${p.isim} odadan tamamen atılsın mı?')) oyuncuSil('${p.isim}')">🗑 At</button>`;

            // Rol gizleme kontrolü
            let gosterilecekRol = rollerGizli ? (p.rol === "Belirlenmedi" ? "Belirlenmedi" : "***") : p.rol;

            list.innerHTML += `
                <div class="player-card ${sinif}">
                    <h4>${p.isim}</h4>
                    <p>Rol: <b>${gosterilecekRol}</b> ${p.gaziCani && !rollerGizli ? '(🛡️)' : ''}</p>
                    <p>Durum: ${p.durum}</p>
                    <div class="mini-btn-group">${btnHtml}</div>
                </div>`;
        }
    });
    document.getElementById("oyuncuSayisi").innerText = canliSayisi;
    approvalSec.style.display = onayBekleyenVar ? "block" : "none";
}

function oyuncuGuncelle(isim, alan, deger) { db.ref(`odalar/${aktifOdaKodu}/oyuncular/${isim}`).update({ [alan]: deger }); }
function oyuncuSil(isim) { db.ref(`odalar/${aktifOdaKodu}/oyuncular/${isim}`).remove(); }
function botOyuncuEkle() { const bot = "Bot_" + Math.floor(Math.random()*1000); db.ref(`odalar/${aktifOdaKodu}/oyuncular/${bot}`).set({ isim: bot, rol: "Belirlenmedi", durum: "Hayatta", puan: 0 }); }
function oyunuKompleKapat() { if(confirm("Odayı tamamen kapatırsan herkes atılır! Emin misin?")) db.ref(`odalar/${aktifOdaKodu}`).remove().then(() => location.reload()); }

// --- GERİ AL SİSTEMİ (Zaman Makinesi) ---
function yedekle(tip) {
    db.ref(`odalar/${aktifOdaKodu}/oyuncular`).once('value').then(s => {
        db.ref(`odalar/${aktifOdaKodu}/yedek_${tip}`).set(s.val());
    });
}
function geriAl(tip) {
    if(!confirm("Son yapılan işlemi (Gece/Oylama) geri almak istediğine emin misin?")) return;
    db.ref(`odalar/${aktifOdaKodu}/yedek_${tip}`).once('value').then(s => {
        if(s.val()) {
            db.ref(`odalar/${aktifOdaKodu}/oyuncular`).set(s.val());
            db.ref(`odalar/${aktifOdaKodu}`).update({ zaman: "Gündüz" });
            alert("Geri alındı!");
        } else alert("Geri alınacak bir veri yok!");
    });
}

// --- ROL DAĞITIMI VE TUR SIFIRLAMA ---
function turuBitirMenu() { document.getElementById("end-round-modal").style.display = "flex"; }
function oyunBittiIsle(sonucTip) {
    pencereKapat('end-round-modal');
    if(!confirm("Emin misin?")) return;
    
    let guncellemeler = {};
    Object.keys(mevcutOyuncular).forEach(isim => {
        let p = mevcutOyuncular[isim];
        if(p.durum !== "Onay Bekliyor" && p.durum !== "Pasif") {
            guncellemeler[`oyuncular/${isim}/durum`] = "Hayatta";
            guncellemeler[`oyuncular/${isim}/rol`] = "Belirlenmedi";
            
            let kazanilan = 0;
            if(sonucTip === 1 && (p.rol === "Vampir" || p.rol === "Alfa Vampir")) kazanilan = 10;
            if(sonucTip === 2 && p.rol !== "Vampir" && p.rol !== "Alfa Vampir" && p.rol !== "Soytarı") kazanilan = 10;

            // Eğer iptal edildiyse (0) puan eklenmez ve o tur pas geçilmiş olur
            if(kazanilan > 0) {
                guncellemeler[`oyuncular/${isim}/puan`] = (p.puan || 0) + kazanilan;
                let mevcutTurPuani = (p.turPuanlari && p.turPuanlari[`tur_${aktifTur}`]) ? p.turPuanlari[`tur_${aktifTur}`] : 0;
                guncellemeler[`oyuncular/${isim}/turPuanlari/tur_${aktifTur}`] = mevcutTurPuani + kazanilan;
            }
        }
    });
    guncellemeler["zaman"] = "Bekleme Salonu";
    guncellemeler["kurallar/alfaKullandi"] = false; // Alfa reset
    db.ref(`odalar/${aktifOdaKodu}`).update(guncellemeler).then(() => alert(sonucTip === 0 ? "Tur iptal edildi (Puan Yok)." : "Oyun bitti puanlar dağıtıldı."));
}

function yeniTurBaslat() {
    if(!confirm("Yeni rolleri dağıtıp turu başlatmak istediğine emin misin?")) return;
    yedekle('tur_basi'); // Tur başı yedeği al
    
    let aktifler = Object.keys(mevcutOyuncular).filter(k => mevcutOyuncular[k].durum === "Hayatta" || mevcutOyuncular[k].durum === "Ölü");
    let roller = [];
    
    const count = (id) => parseInt(document.getElementById(id).value) || 0;
    for(let i=0; i<count("c-vampire"); i++) roller.push("Vampir");
    for(let i=0; i<count("c-alpha"); i++) roller.push("Alfa Vampir");
    for(let i=0; i<count("c-doctor"); i++) roller.push("Doktor");
    for(let i=0; i<count("c-seer"); i++) roller.push("Büyücü");
    for(let i=0; i<count("c-sheriff"); i++) roller.push("Şerif");
    for(let i=0; i<count("c-avenger"); i++) roller.push("İntikamcı");
    for(let i=0; i<count("c-jester"); i++) roller.push("Soytarı");
    for(let i=0; i<count("c-mayor"); i++) roller.push("Muhtar");
    for(let i=0; i<count("c-veteran"); i++) roller.push("Gazi");

    while(roller.length < aktifler.length) roller.push("Köylü");
    roller = roller.slice(0, aktifler.length).sort(() => Math.random() - 0.5);

    let guncellemeler = {};
    aktifler.forEach((isim, idx) => {
        guncellemeler[`oyuncular/${isim}/rol`] = roller[idx];
        guncellemeler[`oyuncular/${isim}/durum`] = "Hayatta";
        if(roller[idx] === "Gazi") guncellemeler[`oyuncular/${isim}/gaziCani`] = 1; // Gazi ekstra can
    });
    
    db.ref(`odalar/${aktifOdaKodu}`).once("value").then(s => {
        guncellemeler["tur"] = (s.val().tur || 0) + 1;
        guncellemeler["zaman"] = "Gündüz";
        guncellemeler["kurallar/alfaKullandi"] = false;
        db.ref(`odalar/${aktifOdaKodu}`).update(guncellemeler);
    });
    document.getElementById("btnGece").style.display = "block";
    document.getElementById("btnOylama").style.display = "block";
}

// --- GECE AKIŞI ---
function geceyiBaslat() {
    yedekle('son_islem'); // Olası hata için yedekle
    db.ref(`odalar/${aktifOdaKodu}`).update({ zaman: "Gece" });
    geceGecmisi = { vampir: null, doktor: null, buyucu: null, serif: null, alfaKullandi: false };
    geceAdimi = 1;
    geceModalGoster();
}

function geceModalGoster() {
    const modal = document.getElementById("action-modal");
    const list = document.getElementById("action-list");
    const title = document.getElementById("action-title");
    const desc = document.getElementById("action-desc");
    const alphaArea = document.getElementById("alpha-area");
    list.innerHTML = ""; alphaArea.style.display = "none";
    document.getElementById("btn-action-pass").style.display = "none"; 
    modal.style.display = "flex";

    let hayattakiler = Object.values(mevcutOyuncular).filter(p => p.durum === "Hayatta");

    if (geceAdimi === 1) {
        title.innerText = "🩸 Vampir Seçimi"; desc.innerText = "Vampirler kimi avlıyor?";
        let alfaYasiyorMu = hayattakiler.some(p => p.rol === "Alfa Vampir");
        if(alfaYasiyorMu && !odaKurallari.alfaKullandi) {
            alphaArea.style.display = "block";
            document.getElementById("alpha-convert").checked = false;
        }
        hayattakiler.forEach(p => {
            if(!p.rol.includes("Vampir")) list.innerHTML += `<button class="modal-item-btn" onclick="geceSonrakiAdim('${p.isim}')">${p.isim} (${p.rol})</button>`;
        });
    } else if (geceAdimi === 2) {
        title.innerText = "⚕️ Doktor Seçimi"; desc.innerText = "Doktor kimi koruyacak?"; 
        document.getElementById("btn-action-pass").style.display = "block";
        hayattakiler.forEach(p => {
            let yasakMi = false;
            if(odaKurallari.docNoConsec && odaKurallari.docGecmis?.sonSecilen === p.isim) yasakMi = true;
            if(odaKurallari.docSelfOnce && p.rol === "Doktor" && odaKurallari.docGecmis?.kendiSecimiKaldi <= 0) yasakMi = true;
            if(!yasakMi) list.innerHTML += `<button class="modal-item-btn" onclick="geceSonrakiAdim('${p.isim}')">${p.isim} (${p.rol})</button>`;
        });
    } else if (geceAdimi === 3) {
        title.innerText = "🔮 Büyücü Seçimi"; desc.innerText = "Kime bakıyor? (Pas geçebilir)"; 
        document.getElementById("btn-action-pass").style.display = "block";
        hayattakiler.forEach(p => { if(p.rol !== "Büyücü") list.innerHTML += `<button class="modal-item-btn" onclick="geceSonrakiAdim('${p.isim}')">${p.isim}</button>`; });
    } else if (geceAdimi === 4) {
        title.innerText = "🔫 Şerif Seçimi"; desc.innerText = "Kimi vuracak? (Dikkat: Yanlış vurursa Şerif ölür)"; 
        document.getElementById("btn-action-pass").style.display = "block";
        hayattakiler.forEach(p => { if(p.rol !== "Şerif") list.innerHTML += `<button class="modal-item-btn" onclick="geceSonrakiAdim('${p.isim}')">${p.isim}</button>`; });
    }
}

function geceSonrakiAdim(secilenIsim) {
    if (geceAdimi === 1) {
        geceGecmisi.vampir = secilenIsim;
        if(document.getElementById("alpha-convert")?.checked) geceGecmisi.alfaKullandi = true;
    }
    else if (geceAdimi === 2) geceGecmisi.doktor = secilenIsim;
    else if (geceAdimi === 3) geceGecmisi.buyucu = secilenIsim;
    else if (geceAdimi === 4) geceGecmisi.serif = secilenIsim;

    geceAdimi++;
    if (geceAdimi > 4) geceyiBitirVeHesapla(); else geceModalGoster();
}

function geceyiBitirVeHesapla() {
    pencereKapat('action-modal');
    let olenler = []; let guncellemeler = {}; let intikamciOlduMu = null;
    let artislar = {}; // Gece kazanılan puanları önce burada biriktiriyoruz (aynı kişi birden fazla kez puan alabilir diye)

    const getRole = (isim) => mevcutOyuncular[isim] ? mevcutOyuncular[isim].rol : null;
    const addScore = (isim, p) => { artislar[isim] = (artislar[isim] || 0) + p; }

    // 1. Şerif Vuruşu
    if (geceGecmisi.serif) {
        let hRol = getRole(geceGecmisi.serif);
        if (hRol.includes("Vampir") || hRol === "Soytarı") {
            olenler.push(geceGecmisi.serif);
            Object.values(mevcutOyuncular).filter(p=>p.rol==="Şerif").forEach(s => addScore(s.isim, 5));
        } else {
            Object.values(mevcutOyuncular).filter(p=>p.rol==="Şerif" && p.durum==="Hayatta").forEach(s => { olenler.push(s.isim); addScore(s.isim, -5); });
        }
    }
    // 2. Büyücü Kararı
    if (geceGecmisi.buyucu) {
        if(getRole(geceGecmisi.buyucu).includes("Vampir")) {
            Object.values(mevcutOyuncular).filter(p=>p.rol==="Büyücü").forEach(b => addScore(b.isim, 3));
            alert("🔮 Büyücü vampiri buldu!");
        } else alert("Büyücü vampiri bulamadı.");
    }
    // 3. Vampir ve Doktor
    if (geceGecmisi.vampir) {
        let vHedef = geceGecmisi.vampir;
        // Doktor Seçimini Kaydet
        if(geceGecmisi.doktor) {
            guncellemeler["kurallar/docGecmis/sonSecilen"] = geceGecmisi.doktor;
            if(getRole(geceGecmisi.doktor) === "Doktor") guncellemeler["kurallar/docGecmis/kendiSecimiKaldi"] = (odaKurallari.docGecmis?.kendiSecimiKaldi || 1) - 1;
        }

        if (geceGecmisi.alfaKullandi) {
            alert(`🧛 Alfa Vampir özelliği kullanıldı! ${vHedef} artık bir Vampir!`);
            guncellemeler[`oyuncular/${vHedef}/rol`] = "Vampir";
            guncellemeler["kurallar/alfaKullandi"] = true;
        } else {
            if (vHedef === geceGecmisi.doktor) {
                Object.values(mevcutOyuncular).filter(p=>p.rol==="Doktor").forEach(d => addScore(d.isim, 3));
            } else {
                if(getRole(vHedef) === "Gazi" && mevcutOyuncular[vHedef].gaziCani > 0) {
                    alert(`🛡️ Gazi saldırıya uğradı ama hayatta kaldı! (Zırhı kırıldı)`);
                    guncellemeler[`oyuncular/${vHedef}/gaziCani`] = 0;
                } else {
                    if(!olenler.includes(vHedef)) olenler.push(vHedef);
                    Object.values(mevcutOyuncular).filter(p=>p.rol.includes("Vampir") && p.durum==="Hayatta").forEach(v => addScore(v.isim, 2));
                }
            }
        }
    }

    // Puanları veritabanı güncellemesine aktar
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

    guncellemeler["zaman"] = "Gündüz";
    db.ref(`odalar/${aktifOdaKodu}`).update(guncellemeler).then(() => {
        alert(olenler.length > 0 ? "Gece ölenler: " + olenler.join(", ") : "Gece kimse ölmedi.");
        if(intikamciOlduMu) intikamciArayuzuGoster();
    });
}

// --- GÜNDÜZ OYLAMASI ---
function oylamaBaslat() {
    yedekle('son_islem');
    document.getElementById("action-title").innerText = "☀️ Gündüz Oylaması";
    document.getElementById("action-desc").innerText = "Kimi asıyorsunuz? (Muhtar oyu 2 sayılır)";
    document.getElementById("btn-action-pass").style.display = "block";
    document.getElementById("alpha-area").style.display = "none";
    const list = document.getElementById("action-list"); list.innerHTML = "";
    
    Object.values(mevcutOyuncular).filter(p => p.durum === "Hayatta").forEach(p => {
        list.innerHTML += `<button class="modal-item-btn" onclick="oylamaBitti('${p.isim}')">${p.isim} (${p.rol})</button>`;
    });
    document.getElementById("action-modal").style.display = "flex";
    geceAdimi = 5; // bypass logic
}

function oylamaBitti(asilanIsim) {
    pencereKapat('action-modal');
    if(!asilanIsim) return alert("Oylama pas geçildi.");

    let p = mevcutOyuncular[asilanIsim];
    let rol = p.rol;
    
    let guncellemeler = { [`oyuncular/${asilanIsim}/durum`]: "Ölü" };
    
    if(rol === "Soytarı") { 
        guncellemeler[`oyuncular/${asilanIsim}/puan`] = (p.puan || 0) + 25;
        let mp = p.turPuanlari && p.turPuanlari[`tur_${aktifTur}`] ? p.turPuanlari[`tur_${aktifTur}`] : 0;
        guncellemeler[`oyuncular/${asilanIsim}/turPuanlari/tur_${aktifTur}`] = mp + 25;
        db.ref(`odalar/${aktifOdaKodu}`).update(guncellemeler).then(() => alert("SOYTARI ASILDI! Oyun Bitti (Soytarı Kazandı)"));
    } else {
        db.ref(`odalar/${aktifOdaKodu}`).update(guncellemeler).then(() => {
            if(rol === "İntikamcı") intikamciArayuzuGoster();
        });
    }
}

function intikamciArayuzuGoster() {
    const list = document.getElementById("avenger-list"); list.innerHTML = "";
    Object.values(mevcutOyuncular).filter(p => p.durum === "Hayatta").forEach(p => list.innerHTML += `<button class="modal-item-btn" onclick="intikamciVurdu('${p.isim}')">${p.isim}</button>`);
    document.getElementById("avenger-modal").style.display = "flex";
}
function intikamciPas() { pencereKapat('avenger-modal'); }
function intikamciVurdu(hedefIsim) {
    pencereKapat('avenger-modal');
    let intikamciPuan = (mevcutOyuncular[hedefIsim].rol.includes("Vampir")) ? 5 : -5;
    let guncellemeler = { [`oyuncular/${hedefIsim}/durum`]: "Ölü" };
    
    Object.values(mevcutOyuncular).filter(p=>p.rol==="İntikamcı").forEach(i => {
        guncellemeler[`oyuncular/${i.isim}/puan`] = (i.puan || 0) + intikamciPuan;
        let mevcutP = i.turPuanlari && i.turPuanlari[`tur_${aktifTur}`] ? i.turPuanlari[`tur_${aktifTur}`] : 0;
        guncellemeler[`oyuncular/${i.isim}/turPuanlari/tur_${aktifTur}`] = mevcutP + intikamciPuan;
    });

    db.ref(`odalar/${aktifOdaKodu}`).update(guncellemeler).then(() => {
        alert(`İntikamcı ${hedefIsim} adlı kişiyi yanında götürdü!`);
    });
}

function skorTablosuGoster() {
    const list = document.getElementById("score-list"); 
    list.innerHTML = "";
    
    // 1. Oynanmış (puan verilmiş) tüm turları tespit et
    let butunTurlar = new Set();
    let siraliOyuncular = Object.values(mevcutOyuncular).sort((a,b) => (b.puan||0) - (a.puan||0));
    
    siraliOyuncular.forEach(p => {
        if(p.turPuanlari) Object.keys(p.turPuanlari).forEach(k => butunTurlar.add(k));
    });

    // Turları sayısal olarak sırala (tur_1, tur_2, tur_4...)
    let turListesi = Array.from(butunTurlar).sort((a, b) => parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]));

    if(turListesi.length === 0) {
        list.innerHTML = "<p>Henüz kimse puan kazanmamış.</p>";
    } else {
        // Tabloyu oluştur
        let html = `<div style="overflow-x:auto;"><table class="score-table"><thead><tr><th>Oyuncu</th>`;
        turListesi.forEach(t => { html += `<th>${t.split('_')[1]}. Tur</th>`; });
        html += `<th>Toplam</th></tr></thead><tbody>`;

        siraliOyuncular.forEach(p => {
            html += `<tr><td style="text-align:left;"><b>${p.isim}</b></td>`;
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