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
let geceGecmisi = { vampir: null, doktor: null, buyucu: null, serif: null };
let geceAdimi = 0;
let mevcutOyuncular = {};

function ekranGoster(ekranId) {
    const ekranlar = ['main-menu', 'join-menu', 'mod-setup', 'mod-dashboard', 'game-screen'];
    ekranlar.forEach(id => document.getElementById(id).style.display = (id === ekranId) ? 'block' : 'none');
}

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

    db.ref("odalar/" + code + "/oyuncular/" + name).update({
        isim: name, rol: "Belirlenmedi", durum: "Onay Bekliyor", puan: 0
    }).then(() => oyuncuEkraniniHazirla(code, name));
}

function oyuncuEkraniniHazirla(code, name) {
    ekranGoster('game-screen');
    document.getElementById("welcomeText").innerText = "Hoş geldin, " + name + "!";
    
    db.ref("odalar/" + code + "/oyuncular/" + name).on("value", snap => {
        const data = snap.val();
        if (data) {
            if(data.durum === "Onay Bekliyor") {
                document.getElementById("statusText").innerText = "Moderatörün seni masaya alması bekleniyor...";
                document.getElementById("roleBox").style.display = "none";
            } else if(data.durum === "Ölü") {
                document.getElementById("statusText").innerHTML = "<span style='color:red;'>ÖLDÜNÜZ!</span>";
                document.getElementById("roleBox").style.display = "block";
                document.getElementById("roleDisplay").innerText = data.rol;
            } else if (data.rol !== "Belirlenmedi") {
                document.getElementById("statusText").innerText = "Masadasın. Roller dağıtıldı!";
                document.getElementById("roleBox").style.display = "block";
                document.getElementById("roleDisplay").innerText = data.rol;
            } else {
                document.getElementById("statusText").innerText = "Masadasın. Rollerin dağıtılması bekleniyor.";
                document.getElementById("roleBox").style.display = "none";
            }
        }
    });

    db.ref("odalar/" + code).on("value", snap => {
        const oda = snap.val();
        if(oda) {
            document.getElementById("roundText").innerText = "Tur: " + (oda.tur || 1);
            document.getElementById("zamanText").innerText = oda.zaman || "Bekleniyor";
            document.body.style.backgroundColor = (oda.zaman === "Gece") ? "#000000" : "#1a1a2e";
        }
    });
}

function masadanKalk() { localStorage.clear(); location.reload(); }

// --- MODERATÖR KURULUMU ---
function odaKur() {
    aktifOdaKodu = document.getElementById("modRoomCode").value.trim();
    if (!aktifOdaKodu) return;

    db.ref("odalar/" + aktifOdaKodu).set({
        tur: 0, zaman: "Bekleme Salonu"
    }).then(() => {
        document.getElementById("dashRoomCode").innerText = aktifOdaKodu;
        ekranGoster('mod-dashboard');
        modPaneliniDinle();
    });
}

function modPaneliniDinle() {
    db.ref("odalar/" + aktifOdaKodu).on("value", snap => {
        const oda = snap.val();
        if(!oda) return;
        mevcutOyuncular = oda.oyuncular || {};
        
        document.getElementById("modZamanText").innerText = oda.zaman;
        
        const list = document.getElementById("player-list-mod");
        const approvalList = document.getElementById("approval-list");
        const approvalSec = document.getElementById("approval-section");
        
        list.innerHTML = ""; approvalList.innerHTML = "";
        let onayBekleyenVar = false;
        let canliSayisi = 0;

        Object.values(mevcutOyuncular).forEach(p => {
            if(p.durum === "Onay Bekliyor") {
                onayBekleyenVar = true;
                approvalList.innerHTML += `
                    <div class="approval-item">
                        <span>${p.isim}</span>
                        <div>
                            <button onclick="oyuncuGuncelle('${p.isim}', 'durum', 'Hayatta')" style="background:#4caf50; padding:5px; width:auto; margin:0;">✔ Al</button>
                            <button onclick="oyuncuSil('${p.isim}')" style="background:#ff4757; padding:5px; width:auto; margin:0;">✖ At</button>
                        </div>
                    </div>`;
            } else {
                if (p.durum === "Hayatta") canliSayisi++;
                const oluSinifi = p.durum === "Ölü" ? "olu" : "";
                list.innerHTML += `<div class="player-card ${oluSinifi}"><h4>${p.isim}</h4><p>Rol: <b>${p.rol}</b></p><p style="font-size:11px; margin-top:5px;">Durum: ${p.durum}</p></div>`;
            }
        });
        
        document.getElementById("oyuncuSayisi").innerText = canliSayisi;
        approvalSec.style.display = onayBekleyenVar ? "block" : "none";
    });
}

function oyuncuGuncelle(isim, alan, deger) { db.ref("odalar/" + aktifOdaKodu + "/oyuncular/" + isim).update({ [alan]: deger }); }
function oyuncuSil(isim) { db.ref("odalar/" + aktifOdaKodu + "/oyuncular/" + isim).remove(); }
function botOyuncuEkle() { const botAdi = "Bot_" + Math.floor(Math.random()*1000); db.ref("odalar/" + aktifOdaKodu + "/oyuncular/" + botAdi).set({ isim: botAdi, rol: "Belirlenmedi", durum: "Hayatta", puan: 0 }); }
function oyunuBitir() { if(confirm("Kapatılsın mı?")) db.ref("odalar/" + aktifOdaKodu).remove().then(() => location.reload()); }

// --- ROL DAĞITIMI VE TUR SIFIRLAMA ---
function turuBitir() {
    if(!confirm("Tur bitti mi? Bütün oyuncular tekrar 'Hayatta' statüsüne geçecek ve roller sıfırlanacak.")) return;
    
    let guncellemeler = {};
    Object.keys(mevcutOyuncular).forEach(isim => {
        if(mevcutOyuncular[isim].durum !== "Onay Bekliyor") {
            guncellemeler["oyuncular/" + isim + "/durum"] = "Hayatta";
            guncellemeler["oyuncular/" + isim + "/rol"] = "Belirlenmedi";
        }
    });
    guncellemeler["zaman"] = "Bekleme Salonu";
    
    db.ref("odalar/" + aktifOdaKodu).update(guncellemeler).then(() => {
        alert("Oyun sıfırlandı. Yeni rol dağıtımı yapabilirsiniz.");
        document.getElementById("btnGece").style.display = "block";
        document.getElementById("btnOylama").style.display = "none";
    });
}

function yeniTurBaslat() {
    let hayattakiler = Object.keys(mevcutOyuncular).filter(k => mevcutOyuncular[k].durum === "Hayatta" || mevcutOyuncular[k].durum === "Ölü");
    
    let roller = [];
    let vCount = parseInt(document.getElementById("count-vampire").value) || 0;
    let dCount = parseInt(document.getElementById("count-doctor").value) || 0;
    let sCount = parseInt(document.getElementById("count-seer").value) || 0;
    let shCount = parseInt(document.getElementById("count-sheriff").value) || 0;
    let aCount = parseInt(document.getElementById("count-avenger").value) || 0;
    let jCount = parseInt(document.getElementById("count-jester").value) || 0;

    for(let i=0; i<vCount; i++) roller.push("Vampir");
    for(let i=0; i<dCount; i++) roller.push("Doktor");
    for(let i=0; i<sCount; i++) roller.push("Büyücü");
    for(let i=0; i<shCount; i++) roller.push("Şerif");
    for(let i=0; i<aCount; i++) roller.push("İntikamcı");
    for(let i=0; i<jCount; i++) roller.push("Soytarı");

    while(roller.length < hayattakiler.length) roller.push("Köylü");
    roller = roller.slice(0, hayattakiler.length);
    roller.sort(() => Math.random() - 0.5);

    let guncellemeler = {};
    hayattakiler.forEach((isim, idx) => {
        guncellemeler["oyuncular/" + isim + "/rol"] = roller[idx];
        guncellemeler["oyuncular/" + isim + "/durum"] = "Hayatta";
    });
    
    db.ref("odalar/" + aktifOdaKodu).once("value").then(s => {
        guncellemeler["tur"] = (s.val().tur || 0) + 1;
        guncellemeler["zaman"] = "Gündüz";
        db.ref("odalar/" + aktifOdaKodu).update(guncellemeler);
    });
    
    document.getElementById("btnGece").style.display = "block";
    document.getElementById("btnOylama").style.display = "block";
}

// --- OTOMATİK GECE AKIŞI ---
function geceyiBaslat() {
    db.ref("odalar/" + aktifOdaKodu).update({ zaman: "Gece" });
    geceGecmisi = { vampir: null, doktor: null, buyucu: null, serif: null };
    geceAdimi = 1;
    geceModalGoster();
}

function geceModalGoster() {
    const modal = document.getElementById("action-modal");
    const list = document.getElementById("action-list");
    const title = document.getElementById("action-title");
    const desc = document.getElementById("action-desc");
    const btnPass = document.getElementById("btn-action-pass");
    list.innerHTML = ""; btnPass.style.display = "none"; modal.style.display = "flex";

    let hayattakiler = Object.values(mevcutOyuncular).filter(p => p.durum === "Hayatta");

    if (geceAdimi === 1) {
        title.innerText = "🩸 Vampirlerin Seçimi"; desc.innerText = "Vampirler kimi avlıyor?";
        hayattakiler.forEach(p => {
            if(p.rol !== "Vampir") list.innerHTML += `<button class="modal-item-btn" onclick="geceSonrakiAdim('${p.isim}')">${p.isim} (${p.rol})</button>`;
        });
    } else if (geceAdimi === 2) {
        title.innerText = "⚕️ Doktorun Seçimi"; desc.innerText = "Doktor kimi koruyacak?"; btnPass.style.display = "block";
        hayattakiler.forEach(p => list.innerHTML += `<button class="modal-item-btn" onclick="geceSonrakiAdim('${p.isim}')">${p.isim} (${p.rol})</button>`);
    } else if (geceAdimi === 3) {
        title.innerText = "🔮 Büyücünün Seçimi"; desc.innerText = "Büyücü kime bakıyor? (Kendisini seçemez)"; btnPass.style.display = "block";
        hayattakiler.forEach(p => {
            if(p.rol !== "Büyücü") list.innerHTML += `<button class="modal-item-btn" onclick="geceSonrakiAdim('${p.isim}')">${p.isim} (${p.rol})</button>`;
        });
    } else if (geceAdimi === 4) {
        title.innerText = "🔫 Şerifin Seçimi"; desc.innerText = "Şerif kimi vuracak? (Kendisini seçemez)"; btnPass.style.display = "block";
        hayattakiler.forEach(p => {
            if(p.rol !== "Şerif") list.innerHTML += `<button class="modal-item-btn" onclick="geceSonrakiAdim('${p.isim}')">${p.isim} (${p.rol})</button>`;
        });
    }
}

function geceSonrakiAdim(secilenIsim) {
    if (geceAdimi === 1) geceGecmisi.vampir = secilenIsim;
    else if (geceAdimi === 2) geceGecmisi.doktor = secilenIsim;
    else if (geceAdimi === 3) geceGecmisi.buyucu = secilenIsim;
    else if (geceAdimi === 4) geceGecmisi.serif = secilenIsim;

    geceAdimi++;
    if (geceAdimi > 4) geceyiBitirVeHesapla();
    else geceModalGoster();
}

function geceyiBitirVeHesapla() {
    document.getElementById("action-modal").style.display = "none";
    let olenler = [];
    let guncellemeler = {};
    let intikamciOlduMu = null;

    const getRole = (isim) => mevcutOyuncular[isim] ? mevcutOyuncular[isim].rol : null;
    const addScore = (isim, puan) => { if(mevcutOyuncular[isim]) guncellemeler["oyuncular/"+isim+"/puan"] = (mevcutOyuncular[isim].puan || 0) + puan; }
    
    // 1. Şerif Kararı (Masumu vurursa ŞERİF ÖLÜR, masum yaşar)
    if (geceGecmisi.serif) {
        let hedefRol = getRole(geceGecmisi.serif);
        if (hedefRol === "Vampir" || hedefRol === "Soytarı") {
            olenler.push(geceGecmisi.serif);
            Object.values(mevcutOyuncular).filter(p=>p.rol==="Şerif").forEach(s => addScore(s.isim, 5));
        } else {
            // Şerif yanlış bildi. Kendi ölecek. Hedef ölmeyecek.
            Object.values(mevcutOyuncular).filter(p=>p.rol==="Şerif" && p.durum==="Hayatta").forEach(s => {
                olenler.push(s.isim);
                addScore(s.isim, -5);
            });
        }
    }

    // 2. Büyücü Kararı
    if (geceGecmisi.buyucu) {
        if(getRole(geceGecmisi.buyucu) === "Vampir") {
            Object.values(mevcutOyuncular).filter(p=>p.rol==="Büyücü").forEach(b => addScore(b.isim, 3));
            alert("Büyücü doğru bildi! Vampiri buldu.");
        } else alert("Büyücü vampiri bulamadı.");
    }

    // 3. Vampir ve Doktor Kararı
    if (geceGecmisi.vampir) {
        if (geceGecmisi.vampir === geceGecmisi.doktor) {
            Object.values(mevcutOyuncular).filter(p=>p.rol==="Doktor").forEach(d => addScore(d.isim, 3));
            alert("Doktor başarılı bir kurtarış yaptı!");
        } else {
            // Eğer Şerif'in hatasından dolayı ölenler arasında değilse ekle (mükerrer ölümü engellemek için)
            if(!olenler.includes(geceGecmisi.vampir)) {
                olenler.push(geceGecmisi.vampir);
            }
            Object.values(mevcutOyuncular).filter(p=>p.rol==="Vampir" && p.durum==="Hayatta").forEach(v => addScore(v.isim, 2));
        }
    }

    // Ölümleri uygula
    olenler.forEach(isim => {
        guncellemeler["oyuncular/" + isim + "/durum"] = "Ölü";
        if(getRole(isim) === "İntikamcı") intikamciOlduMu = isim;
    });

    guncellemeler["zaman"] = "Gündüz";
    db.ref("odalar/" + aktifOdaKodu).update(guncellemeler).then(() => {
        let msg = olenler.length > 0 ? "Gece ölenler: " + olenler.join(", ") : "Gece kimse ölmedi.";
        alert("Sabah oldu! " + msg);
        if(intikamciOlduMu) intikamciArayuzuGoster();
    });
}

// --- GÜNDÜZ OYLAMASI ---
function oylamaBaslat() {
    geceAdimi = 5; 
    const modal = document.getElementById("action-modal");
    const list = document.getElementById("action-list");
    document.getElementById("action-title").innerText = "☀️ Gündüz Oylaması";
    document.getElementById("action-desc").innerText = "Oylamada kim asıldı?";
    document.getElementById("btn-action-pass").style.display = "block";
    list.innerHTML = "";
    
    Object.values(mevcutOyuncular).filter(p => p.durum === "Hayatta").forEach(p => {
        list.innerHTML += `<button class="modal-item-btn" onclick="oylamaBitti('${p.isim}')">${p.isim} (${p.rol})</button>`;
    });
    modal.style.display = "flex";
}

function oylamaBitti(asilanIsim) {
    document.getElementById("action-modal").style.display = "none";
    if(!asilanIsim) return alert("Oylama pas geçildi.");

    let rol = mevcutOyuncular[asilanIsim].rol;
    db.ref("odalar/"+aktifOdaKodu+"/oyuncular/"+asilanIsim).update({durum: "Ölü"});
    
    if(rol === "Soytarı") {
        db.ref("odalar/"+aktifOdaKodu+"/oyuncular/"+asilanIsim+"/puan").transaction(p=>(p||0)+25);
        alert("SOYTARI ASILDI! +25 Puan kazandı.");
    } else if(rol === "İntikamcı") {
        intikamciArayuzuGoster();
    }
}

// --- İNTİKAMCI TETİKLENMESİ ---
function intikamciArayuzuGoster() {
    const modal = document.getElementById("avenger-modal");
    const list = document.getElementById("avenger-list");
    list.innerHTML = "";
    Object.values(mevcutOyuncular).filter(p => p.durum === "Hayatta").forEach(p => {
        list.innerHTML += `<button class="modal-item-btn" onclick="intikamciVurdu('${p.isim}')">${p.isim} (${p.rol})</button>`;
    });
    modal.style.display = "flex";
}

function intikamciPas() { document.getElementById("avenger-modal").style.display = "none"; }

function intikamciVurdu(hedefIsim) {
    document.getElementById("avenger-modal").style.display = "none";
    db.ref("odalar/"+aktifOdaKodu+"/oyuncular/"+hedefIsim).update({durum: "Ölü"});
    
    let intikamciPuan = (mevcutOyuncular[hedefIsim].rol === "Vampir") ? 5 : -5;
    Object.values(mevcutOyuncular).filter(p=>p.rol==="İntikamcı").forEach(i => {
        db.ref("odalar/"+aktifOdaKodu+"/oyuncular/"+i.isim+"/puan").transaction(p=>(p||0)+intikamciPuan);
    });
    alert(`İntikamcı ${hedefIsim} adlı kişiyi yanında götürdü!`);
}

// --- SKOR TABLOSU ---
function skorTablosuGoster() {
    const modal = document.getElementById("score-modal");
    const list = document.getElementById("score-list");
    list.innerHTML = "";
    let siralama = Object.values(mevcutOyuncular).sort((a,b) => (b.puan||0) - (a.puan||0));
    siralama.forEach(p => {
        list.innerHTML += `<div style="margin-bottom:10px; font-size:18px;"><b>${p.isim}</b> (${p.rol}): <span style="color:#f9d342">${p.puan||0} Puan</span></div>`;
    });
    modal.style.display = "flex";
}

// --- BASILI TUTMA EFEKTİ ---
const viewBtn = document.getElementById("viewRoleBtn");
const roleDisplay = document.getElementById("roleDisplay");
viewBtn.addEventListener("mousedown", () => roleDisplay.style.display = "block");
viewBtn.addEventListener("touchstart", () => roleDisplay.style.display = "block");
viewBtn.addEventListener("mouseup", () => roleDisplay.style.display = "none");
viewBtn.addEventListener("touchend", () => roleDisplay.style.display = "none");