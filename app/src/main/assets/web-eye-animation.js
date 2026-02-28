(function() {
    // ===== THEMES =====
    var THEMES = {
        odgreen:{ iris:"#6b7c3f", irisInner:"#2d3518", glow:"rgba(107,124,63,0.25)" },
        cyan:   { iris:"#00e5ff", irisInner:"#006070", glow:"rgba(0,229,255,0.3)" },
        amber:  { iris:"#ffb300", irisInner:"#7a4e00", glow:"rgba(255,179,0,0.3)" },
        green:  { iris:"#00e676", irisInner:"#00522a", glow:"rgba(0,230,118,0.3)" },
        red:    { iris:"#ff1744", irisInner:"#7a0015", glow:"rgba(255,23,68,0.3)" },
        white:  { iris:"#e0e0e0", irisInner:"#606060", glow:"rgba(224,224,224,0.2)" },
        purple: { iris:"#d500f9", irisInner:"#5c007a", glow:"rgba(213,0,249,0.3)" }
    };
    var THEME_ORDER = ["odgreen","cyan","amber","green","red","white","purple"];
    var themeIdx = 0, curTheme = THEMES.odgreen;

    // ===== GLOBAL STATE =====
    var imuEnabled = true;
    var faceTrackingOn = false;
    var activeMood = null;
    var emphasisTid = null;
    var menuOpen = false;
    var isAnimating = false;
    var blinkTid = null;
    var browIdleTid = null;
    var imuActive = false;
    var touchActive = false;
    var longPressTimer = null;
    var longPressTriggered = false;
    var MAX_GAZE = 45;
    var kioskEnabled = false;
    var storedPasscode = "1234";
    var snapshotOn = false;
    var snapCount = 0;

    // ===== CSS =====
    var css = document.createElement("style");
    css.textContent = [
        "*{margin:0;padding:0;box-sizing:border-box}",
        ".eye-container{position:fixed;top:0;left:0;width:100vw;height:100vh;background:#000;display:flex;justify-content:center;align-items:center;gap:10.8vw;overflow:hidden}",
        ".eye-group{display:flex;flex-direction:column;align-items:center;position:relative}",
        ".eyebrow{width:34vw;height:6.5vh;margin-bottom:2.5vh;transform-origin:center bottom;position:relative;z-index:2;background:linear-gradient(180deg,#f4f4f4 0%,#fff 35%,#eee 100%);box-shadow:0 0.4vh 0.8vh rgba(0,0,0,0.12),0 0.15vh 0.25vh rgba(0,0,0,0.08),inset 0 0.2vh 0.4vh rgba(255,255,255,0.6)}",
        "#leftEyebrow{border-radius:45% 12% 14% 24%/100% 90% 24% 34%}",
        "#rightEyebrow{border-radius:12% 45% 24% 14%/90% 100% 34% 24%}",
        ".eye{position:relative;width:33vw;height:60vh;border-radius:50%;overflow:hidden;z-index:1;transform-origin:center center;background:radial-gradient(ellipse at 38% 30%,#fff 0%,#fdfdfd 30%,#f5f5f5 55%,#ececec 80%,#ddd 100%);box-shadow:inset 0 0.5vh 1.5vh rgba(0,0,0,0.1),inset 0 -0.3vh 1vh rgba(0,0,0,0.04),0 0.3vh 1.5vh rgba(0,0,0,0.2),0 0 2.5vh rgba(0,0,0,0.08)}",
        ".iris-wrap{position:absolute;top:50%;left:50%;width:58%;height:58%;transform:translate(-50%,-50%)}",
        ".iris{width:100%;height:100%;border-radius:50%;position:relative;background:radial-gradient(circle at 38% 30%,var(--iris-color) 0%,var(--iris-color) 35%,var(--iris-inner) 75%,#111 100%);box-shadow:0 0 2vh var(--iris-glow),0 0 0.6vh var(--iris-glow),inset 0 0.3vh 0.8vh rgba(0,0,0,0.2),inset 0 -0.2vh 0.4vh rgba(255,255,255,0.06)}",
        ".iris::before{content:'';position:absolute;inset:8%;border-radius:50%;border:1px solid rgba(255,255,255,0.06);background:radial-gradient(circle at 50% 50%,transparent 45%,rgba(0,0,0,0.08) 100%);pointer-events:none}",
        ".iris::after{content:'';position:absolute;top:4%;left:20%;width:55%;height:30%;border-radius:50%;background:linear-gradient(180deg,rgba(255,255,255,0.1) 0%,transparent 100%);pointer-events:none}",
        ".iris-fibers{position:absolute;inset:5%;border-radius:50%;background:repeating-conic-gradient(rgba(255,255,255,0.07) 0deg 1.2deg,rgba(0,0,0,0.06) 1.2deg 2.4deg,transparent 2.4deg 4.8deg,rgba(0,0,0,0.04) 4.8deg 5.5deg,transparent 5.5deg 8deg);pointer-events:none;z-index:1;opacity:0.7}",
        ".pupil{position:absolute;top:29%;left:29%;width:42%;height:42%;border-radius:50%;background:radial-gradient(circle at 44% 38%,#222 0%,#0a0a0a 45%,#000 70%);box-shadow:inset 0 0.15vh 0.5vh rgba(255,255,255,0.04);z-index:2}",
        ".highlight{position:absolute;top:14%;left:54%;width:26%;height:26%;background:radial-gradient(circle at 45% 40%,rgba(255,255,255,0.95) 0%,rgba(255,255,255,0.5) 30%,rgba(255,255,255,0) 70%);border-radius:50%;pointer-events:none}",
        ".highlight-sm{position:absolute;top:60%;left:22%;width:14%;height:14%;background:radial-gradient(circle,rgba(255,255,255,0.4) 0%,rgba(255,255,255,0) 65%);border-radius:50%;pointer-events:none}",
        // menu
        "#eyeMenu{display:none;position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.85);z-index:9999;justify-content:center;align-items:center;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}",
        "#eyeMenu.open{display:flex}",
        "#menuPanel{background:rgba(20,20,28,0.95);border-radius:16px;padding:16px 20px;width:88vw;max-height:90vh;overflow-y:auto;border:1px solid rgba(255,255,255,0.08);box-shadow:0 8px 32px rgba(0,0,0,0.6)}",
        ".menu-section{margin-bottom:14px}",
        ".menu-label{font:600 11px/1 system-ui,sans-serif;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px}",
        ".mood-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}",
        ".mood-btn{background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:8px 4px;text-align:center;cursor:pointer;transition:background .15s,border-color .15s;-webkit-tap-highlight-color:transparent}",
        ".mood-btn:active,.mood-btn.active{background:rgba(0,229,255,0.15);border-color:rgba(0,229,255,0.4)}",
        ".mood-btn .mood-icon{font-size:22px;display:block;margin-bottom:2px}",
        ".mood-btn .mood-name{font:500 9px/1.1 system-ui,sans-serif;color:rgba(255,255,255,0.7)}",
        ".theme-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}",
        ".theme-swatch{width:32px;height:32px;border-radius:50%;cursor:pointer;border:2px solid transparent;transition:border-color .15s,transform .15s;-webkit-tap-highlight-color:transparent}",
        ".theme-swatch.active{border-color:#fff;transform:scale(1.15)}",
        ".toggle-row{display:flex;align-items:center;gap:12px;margin-bottom:8px}",
        ".toggle-label{font:500 13px/1 system-ui,sans-serif;color:rgba(255,255,255,0.8);flex:1}",
        ".toggle-track{width:44px;height:24px;border-radius:12px;background:rgba(255,255,255,0.15);position:relative;cursor:pointer;transition:background .2s;-webkit-tap-highlight-color:transparent}",
        ".toggle-track.on{background:rgba(0,229,255,0.5)}",
        ".toggle-knob{width:20px;height:20px;border-radius:50%;background:#fff;position:absolute;top:2px;left:2px;transition:left .2s}",
        ".toggle-track.on .toggle-knob{left:22px}",
        ".custom-color-row{display:flex;align-items:center;gap:8px;margin-top:8px}",
        "#customColorInput{width:42px;height:42px;border:none;border-radius:10px;cursor:pointer;background:transparent;padding:0}",
        "#customColorInput::-webkit-color-swatch-wrapper{padding:0}",
        "#customColorInput::-webkit-color-swatch{border:2px solid rgba(255,255,255,0.2);border-radius:8px}",
        "#customColorHex{background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:8px 10px;color:#fff;font:500 13px/1 monospace;width:100px;outline:none}",
        "#customColorHex:focus{border-color:rgba(0,229,255,0.5)}",
        "#applyCustomColor{background:rgba(0,229,255,0.2);border:1px solid rgba(0,229,255,0.3);border-radius:8px;padding:8px 14px;color:#00e5ff;font:600 12px/1 system-ui,sans-serif;cursor:pointer;-webkit-tap-highlight-color:transparent}",
        "#refreshEyes{display:block;width:100%;margin-top:10px;padding:10px;background:rgba(0,229,255,0.1);border:1px solid rgba(0,229,255,0.25);border-radius:10px;color:rgba(0,229,255,0.8);font:600 12px/1 system-ui,sans-serif;cursor:pointer;text-align:center;-webkit-tap-highlight-color:transparent}",
        "#refreshEyes:active{background:rgba(0,229,255,0.25)}",
        "#closeMenu{display:block;width:100%;margin-top:4px;padding:10px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:rgba(255,255,255,0.5);font:600 12px/1 system-ui,sans-serif;cursor:pointer;text-align:center;-webkit-tap-highlight-color:transparent}",
        "#passcodeOverlay{display:none;position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.92);z-index:10000;justify-content:center;align-items:center;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}",
        "#passcodeOverlay.open{display:flex}",
        "#passcodePanel{display:flex;flex-direction:column;align-items:center;padding:24px}",
        ".pin-title{color:#fff;font:600 16px/1 system-ui,sans-serif;margin-bottom:18px;letter-spacing:1px}",
        ".pin-dots{display:flex;gap:14px;margin-bottom:18px}",
        ".pin-dot{width:16px;height:16px;border-radius:50%;border:2px solid rgba(255,255,255,0.3);background:transparent;transition:background .15s,border-color .15s}",
        ".pin-dot.filled{background:#00e5ff;border-color:#00e5ff}",
        ".pin-error{color:#ff1744;font:500 12px/1 system-ui,sans-serif;height:16px;margin-bottom:10px;opacity:0;transition:opacity .2s}",
        ".pin-error.show{opacity:1}",
        ".numpad{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;width:210px}",
        ".num-key{background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:12px;text-align:center;color:#fff;font:500 20px/1 system-ui,sans-serif;cursor:pointer;-webkit-tap-highlight-color:transparent;user-select:none}",
        ".num-key:active{background:rgba(0,229,255,0.2)}",
        "@keyframes pinShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}",
        ".pin-dots.shake{animation:pinShake .3s}",
        ".snap-count{color:rgba(255,255,255,0.5);font:500 13px/1 system-ui,sans-serif}",
        ".snap-clear{background:rgba(255,70,70,0.15);border:1px solid rgba(255,70,70,0.25);border-radius:8px;padding:6px 12px;color:#ff6b6b;font:600 11px/1 system-ui,sans-serif;cursor:pointer;margin-left:8px;-webkit-tap-highlight-color:transparent}",
        ".passcode-input{background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:7px 10px;color:#fff;font:500 13px/1 monospace;width:80px;outline:none;text-align:center;letter-spacing:4px}",
        ".passcode-input:focus{border-color:rgba(0,229,255,0.5)}",
        ".passcode-set{background:rgba(0,229,255,0.2);border:1px solid rgba(0,229,255,0.3);border-radius:8px;padding:7px 12px;color:#00e5ff;font:600 11px/1 system-ui,sans-serif;cursor:pointer;margin-left:6px;-webkit-tap-highlight-color:transparent}"
    ].join("\n");
    document.head.appendChild(css);

    var ctr = document.querySelector(".eye-container");
    if (!ctr) return;

    // ===== EYE DOM =====
    function mkEye(side) {
        var g=document.createElement("div");g.className="eye-group";g.id=side+"Group";
        var b=document.createElement("div");b.className="eyebrow";b.id=side+"Eyebrow";
        var e=document.createElement("div");e.className="eye";e.id=side+"Eye";
        var iw=document.createElement("div");iw.className="iris-wrap";iw.id=side+"IrisWrap";
        var ir=document.createElement("div");ir.className="iris";
        var pu=document.createElement("div");pu.className="pupil";
        var h1=document.createElement("div");h1.className="highlight";
        var h2=document.createElement("div");h2.className="highlight-sm";
        var fb=document.createElement("div");fb.className="iris-fibers";
        ir.appendChild(fb);ir.appendChild(pu);ir.appendChild(h1);ir.appendChild(h2);
        iw.appendChild(ir);e.appendChild(iw);g.appendChild(b);g.appendChild(e);
        return {group:g,brow:b,eye:e,irisWrap:iw,pupil:pu};
    }
    var L=mkEye("left"),R=mkEye("right");
    ctr.appendChild(L.group);ctr.appendChild(R.group);
    var eyes=[L.eye,R.eye],brows=[L.brow,R.brow],irises=[L.irisWrap,R.irisWrap],pupils=[L.pupil,R.pupil];
    var REST_BR={left:"45% 12% 14% 24%/100% 90% 24% 34%",right:"12% 45% 24% 14%/90% 100% 34% 24%"};

    // ===== PERSISTENT MOOD HOLDS =====
    var HOLDS = {
        joy: {
            browY:-14,browSY:1.15,lRot:0,rRot:0,
            lBR:"75% 20% 14% 18%/140% 50% 22% 28%",rBR:"20% 75% 18% 14%/50% 140% 28% 22%",
            eSY:0.92,eSX:1,eBR:"50% 50% 30% 30%",iY:0
        },
        sadness: {
            browY:3,browSY:1,lRot:8,rRot:-8,
            lBR:"35% 50% 14% 18%/50% 80% 22% 28%",rBR:"50% 35% 18% 14%/80% 50% 28% 22%",
            eSY:0.88,eSX:0.97,eBR:"50%",iY:3
        },
        anger: {
            browY:5,browSY:1.2,lRot:-12,rRot:12,
            lBR:"25% 55% 12% 16%/30% 90% 18% 24%",rBR:"55% 25% 16% 12%/90% 30% 24% 18%",
            eSY:0.82,eSX:1,eBR:"50%",iY:0
        },
        surprise: {
            browY:-36,browSY:1.25,lRot:0,rRot:0,
            lBR:"80% 20% 14% 20%/160% 40% 22% 30%",rBR:"20% 80% 20% 14%/40% 160% 30% 22%",
            eSY:1.06,eSX:1.06,eBR:"50%",iY:0
        },
        fear: {
            browY:-34,browSY:1.15,lRot:3,rRot:-3,
            lBR:"80% 25% 14% 20%/150% 50% 22% 30%",rBR:"25% 80% 20% 14%/50% 150% 30% 22%",
            eSY:1.05,eSX:1.03,eBR:"50%",iY:-2
        },
        disgust: {
            browY:2,browSY:1.05,lRot:-5,rRot:10,
            lBR:"35% 40% 12% 16%/50% 60% 18% 24%",rBR:"20% 70% 16% 12%/40% 130% 24% 18%",
            eSY:0.82,eSX:1,eBR:"50%",iY:3
        },
        confusion: {
            browY:-5,browSY:1.05,lRot:-12,rRot:7,
            lBR:"80% 15% 14% 20%/150% 30% 22% 30%",rBR:"40% 45% 16% 14%/60% 70% 24% 22%",
            eSY:0.94,eSX:1,eBR:"50%",iY:0
        },
        love: {
            browY:-10,browSY:1.1,lRot:0,rRot:0,
            lBR:"70% 25% 14% 20%/120% 60% 22% 30%",rBR:"25% 70% 20% 14%/60% 120% 30% 22%",
            eSY:0.88,eSX:1.03,eBR:"50% 50% 30% 30%",iY:0
        },
        sleepy: {
            browY:6,browSY:0.75,lRot:0,rRot:0,
            lBR:"40% 35% 14% 18%/50% 45% 22% 28%",rBR:"35% 40% 18% 14%/45% 50% 28% 22%",
            eSY:0.68,eSX:1,eBR:"50%",iY:5
        },
        excitement: {
            browY:-32,browSY:1.25,lRot:0,rRot:0,
            lBR:"80% 20% 14% 20%/150% 40% 22% 30%",rBR:"20% 80% 20% 14%/40% 150% 30% 22%",
            eSY:1.05,eSX:1.04,eBR:"50%",iY:0
        }
    };

    var NEUTRAL = {browY:0,browSY:1,lRot:0,rRot:0,lBR:REST_BR.left,rBR:REST_BR.right,eSY:1,eSX:1,eBR:"50%",iY:0};
    var currentHold = null;
    function hold() { return currentHold || NEUTRAL; }

    // ===== MENU DOM =====
    var MOODS = [
        {id:"joy",icon:"\u{1F604}",name:"Happy"},{id:"sadness",icon:"\u{1F622}",name:"Sad"},
        {id:"anger",icon:"\u{1F621}",name:"Angry"},{id:"surprise",icon:"\u{1F632}",name:"Surprise"},
        {id:"fear",icon:"\u{1F628}",name:"Fear"},{id:"disgust",icon:"\u{1F922}",name:"Disgust"},
        {id:"confusion",icon:"\u{1F914}",name:"Confused"},{id:"love",icon:"\u{1F60D}",name:"Love"},
        {id:"sleepy",icon:"\u{1F634}",name:"Sleepy"},{id:"excitement",icon:"\u{1F929}",name:"Excited"}
    ];

    // ===== PASSCODE OVERLAY =====
    var pcOverlay=document.createElement("div");pcOverlay.id="passcodeOverlay";
    pcOverlay.innerHTML=[
        '<div id="passcodePanel">',
        '<div class="pin-title">ENTER PASSCODE</div>',
        '<div class="pin-dots" id="pinDots"><span class="pin-dot"></span><span class="pin-dot"></span><span class="pin-dot"></span><span class="pin-dot"></span></div>',
        '<div class="pin-error" id="pinError">Incorrect</div>',
        '<div class="numpad" id="numpad">',
        '<div class="num-key" data-val="1">1</div><div class="num-key" data-val="2">2</div><div class="num-key" data-val="3">3</div>',
        '<div class="num-key" data-val="4">4</div><div class="num-key" data-val="5">5</div><div class="num-key" data-val="6">6</div>',
        '<div class="num-key" data-val="7">7</div><div class="num-key" data-val="8">8</div><div class="num-key" data-val="9">9</div>',
        '<div class="num-key" data-val="C">\u232B</div><div class="num-key" data-val="0">0</div><div class="num-key" data-val="X">\u2715</div>',
        '</div></div>'
    ].join("");
    document.body.appendChild(pcOverlay);

    var pinDots=document.getElementById("pinDots");
    var pinError=document.getElementById("pinError");
    var numpad=document.getElementById("numpad");
    var pinCode="";

    function updatePinDots(){
        var dots=pinDots.querySelectorAll(".pin-dot");
        for(var i=0;i<dots.length;i++) dots[i].className="pin-dot"+(i<pinCode.length?" filled":"");
    }
    function openPasscode(){
        pinCode="";updatePinDots();
        pinError.className="pin-error";
        pcOverlay.classList.add("open");
    }
    function closePasscode(){pcOverlay.classList.remove("open")}

    numpad.addEventListener("click",function(e){
        var k=e.target.closest(".num-key");if(!k)return;
        var v=k.dataset.val;
        if(v==="X"){closePasscode();return}
        if(v==="C"){pinCode=pinCode.slice(0,-1);updatePinDots();return}
        if(pinCode.length>=4)return;
        pinCode+=v;updatePinDots();
        if(pinCode.length===4){
            setTimeout(function(){
                if(pinCode===storedPasscode){
                    closePasscode();openMenu();
                } else {
                    pinDots.classList.add("shake");pinError.classList.add("show");
                    setTimeout(function(){pinCode="";updatePinDots();pinDots.classList.remove("shake");pinError.classList.remove("show")},600);
                }
            },150);
        }
    });

    var menuEl=document.createElement("div");menuEl.id="eyeMenu";
    menuEl.innerHTML=[
        '<div id="menuPanel">',
        '<div class="menu-section"><div class="menu-label">Mood</div><div class="mood-grid" id="moodGrid"></div></div>',
        '<div class="menu-section"><div class="menu-label">Iris Color</div><div class="theme-row" id="themeRow"></div>',
        '<div class="custom-color-row"><input type="color" id="customColorInput" value="#00e5ff">',
        '<input type="text" id="customColorHex" placeholder="#00e5ff" maxlength="7">',
        '<div id="applyCustomColor">Apply</div></div></div>',
        '<div class="menu-section">',
        '<div class="toggle-row"><span class="toggle-label">IMU (tilt tracking)</span><div class="toggle-track on" id="imuToggle"><div class="toggle-knob"></div></div></div>',
        '<div class="toggle-row"><span class="toggle-label">Face tracking</span><div class="toggle-track" id="faceToggle"><div class="toggle-knob"></div></div></div>',
        '</div>',
        '<div class="menu-section"><div class="menu-label">Security</div>',
        '<div class="toggle-row"><span class="toggle-label">Kiosk Lock</span><div class="toggle-track" id="kioskToggle"><div class="toggle-knob"></div></div></div>',
        '<div class="toggle-row" style="margin-top:4px"><span class="toggle-label">Passcode</span><input type="tel" class="passcode-input" id="passcodeInput" maxlength="8" placeholder="1234"><div class="passcode-set" id="setPasscodeBtn">Set</div></div>',
        '</div>',
        '<div class="menu-section"><div class="menu-label">Recording</div>',
        '<div class="toggle-row"><span class="toggle-label">Auto Snapshot</span><div class="toggle-track" id="snapshotToggle"><div class="toggle-knob"></div></div></div>',
        '<div class="toggle-row"><span class="toggle-label">Snapshots</span><span class="snap-count" id="snapCountLabel">0</span><div class="snap-clear" id="clearSnapsBtn">Clear</div></div>',
        '</div>',
        '<div id="refreshEyes">\u21BB REFRESH</div>',
        '<div id="closeMenu">CLOSE</div></div>'
    ].join("");
    document.body.appendChild(menuEl);

    var moodGrid=document.getElementById("moodGrid"),moodBtns={};
    MOODS.forEach(function(m){
        var b=document.createElement("div");b.className="mood-btn";b.dataset.mood=m.id;
        b.innerHTML='<span class="mood-icon">'+m.icon+'</span><span class="mood-name">'+m.name+'</span>';
        moodGrid.appendChild(b);moodBtns[m.id]=b;
    });

    var themeRow=document.getElementById("themeRow"),swatches={};
    THEME_ORDER.forEach(function(n){
        var s=document.createElement("div");s.className="theme-swatch"+(n===THEME_ORDER[themeIdx]?" active":"");
        s.style.background=THEMES[n].iris;s.dataset.theme=n;themeRow.appendChild(s);swatches[n]=s;
    });

    var ccInput=document.getElementById("customColorInput"),ccHex=document.getElementById("customColorHex");
    var ccApply=document.getElementById("applyCustomColor");
    var imuToggle=document.getElementById("imuToggle");
    var faceToggle=document.getElementById("faceToggle");
    var closeBtn=document.getElementById("closeMenu");
    var kioskToggle=document.getElementById("kioskToggle");
    var passcodeInput=document.getElementById("passcodeInput");
    var setPasscodeBtn=document.getElementById("setPasscodeBtn");
    var snapshotToggle=document.getElementById("snapshotToggle");
    var snapCountLabel=document.getElementById("snapCountLabel");
    var clearSnapsBtn=document.getElementById("clearSnapsBtn");

    // ===== GSAP =====
    function G(){return new Promise(function(ok){if(typeof gsap!=="undefined")return ok();var s=document.createElement("script");s.src="gsap.min.js";s.onload=ok;document.head.appendChild(s);})}
    function clamp(v,a,b){return Math.max(a,Math.min(b,v))}

    // ===== THEME =====
    function applyTheme(t){curTheme=t;var s=document.documentElement.style;s.setProperty("--iris-color",t.iris);s.setProperty("--iris-inner",t.irisInner);s.setProperty("--iris-glow",t.glow)}
    applyTheme(curTheme);
    function setThemeByName(n){if(!THEMES[n])return;themeIdx=THEME_ORDER.indexOf(n);applyTheme(THEMES[n]);updSwatches(n)}
    function updSwatches(a){THEME_ORDER.forEach(function(n){swatches[n].className="theme-swatch"+(n===a?" active":"");})}
    function setCustomColor(hex){hex=hex.trim();if(!/^#[0-9a-fA-F]{6}$/.test(hex))return;var r=parseInt(hex.substr(1,2),16),g=parseInt(hex.substr(3,2),16),b=parseInt(hex.substr(5,2),16);var inner="#"+Math.max(0,r-100).toString(16).padStart(2,"0")+Math.max(0,g-100).toString(16).padStart(2,"0")+Math.max(0,b-100).toString(16).padStart(2,"0");applyTheme({iris:hex,irisInner:inner,glow:"rgba("+r+","+g+","+b+",0.3)"});updSwatches(null);ccInput.value=hex;ccHex.value=hex}

    // ===== MOOD SYSTEM =====
    function enterMood(name) {
        var h = HOLDS[name];
        if (!h) return;
        activeMood = name;
        currentHold = h;
        Object.keys(moodBtns).forEach(function(k){moodBtns[k].className="mood-btn"+(k===name?" active":"")});

        G().then(function() {
            gsap.to(brows,{y:h.browY,scaleY:h.browSY,duration:0.6,ease:"power2.inOut",overwrite:true});
            gsap.to(L.brow,{rotation:h.lRot,borderRadius:h.lBR,duration:0.6,ease:"power2.inOut",overwrite:true});
            gsap.to(R.brow,{rotation:h.rRot,borderRadius:h.rBR,duration:0.6,ease:"power2.inOut",overwrite:true});
            gsap.to(eyes,{scaleY:h.eSY,scaleX:h.eSX,borderRadius:h.eBR,duration:0.6,ease:"power2.inOut",overwrite:true});
            gsap.to(irises,{y:h.iY||0,duration:0.5,ease:"power2.inOut",overwrite:true});
        });

        startEmphasis(name);
    }

    function exitMood() {
        activeMood = null;
        currentHold = null;
        stopEmphasis();
        Object.keys(moodBtns).forEach(function(k){moodBtns[k].className="mood-btn"});

        G().then(function() {
            gsap.to(brows,{y:0,scaleY:1,scaleX:1,rotation:0,duration:0.6,ease:"power2.inOut",overwrite:true});
            gsap.to(L.brow,{borderRadius:REST_BR.left,rotation:0,duration:0.6,ease:"power2.inOut",overwrite:true});
            gsap.to(R.brow,{borderRadius:REST_BR.right,rotation:0,duration:0.6,ease:"power2.inOut",overwrite:true});
            gsap.to(eyes,{scaleY:1,scaleX:1,borderRadius:"50%",y:0,x:0,duration:0.6,ease:"power2.inOut",overwrite:true});
            gsap.to(irises,{y:0,duration:0.5,ease:"power2.inOut",overwrite:true});
            gsap.to(pupils,{x:0,y:0,duration:0.4,ease:"power2.inOut",overwrite:true});
        });
    }

    // Periodic re-emphasis per mood
    function startEmphasis(name) {
        stopEmphasis();
        emphasisTid = setInterval(function(){
            if(isAnimating||menuOpen) return;
            G().then(function(){
                var h=HOLDS[name]; if(!h) return;
                if(name==="anger") {
                    gsap.timeline()
                        .to(eyes,{x:"+=5",duration:0.04,yoyo:true,repeat:4})
                        .to(brows,{x:"+=3",duration:0.04,yoyo:true,repeat:4},0)
                        .to(eyes,{x:0,duration:0.1}).to(brows,{x:0,duration:0.1},"<");
                } else if(name==="joy"||name==="excitement") {
                    gsap.timeline()
                        .to(eyes,{y:"-=6",duration:0.08,yoyo:true,repeat:2})
                        .to(brows,{y:h.browY-4,duration:0.08,yoyo:true,repeat:2},0)
                        .to(eyes,{y:0,duration:0.1})
                        .to(brows,{y:h.browY,duration:0.1},"<");
                } else if(name==="fear") {
                    gsap.timeline()
                        .to(brows,{x:"+=3",duration:0.05,yoyo:true,repeat:5})
                        .to(brows,{x:0,duration:0.1});
                } else if(name==="sleepy") {
                    gsap.timeline()
                        .to(eyes,{scaleY:0.06,duration:0.4})
                        .to(eyes,{scaleY:h.eSY,duration:0.5});
                } else if(name==="love") {
                    gsap.timeline()
                        .to(eyes,{scaleX:h.eSX+0.05,duration:0.3,yoyo:true,repeat:1})
                }
            });
        }, 3000 + Math.random()*2000);
    }

    function stopEmphasis(){if(emphasisTid){clearInterval(emphasisTid);emphasisTid=null}}

    // ===== MENU INTERACTIONS =====
    function openMenu(){
        menuOpen=true;menuEl.classList.add("open");
        imuToggle.className="toggle-track"+(imuEnabled?" on":"");
        faceToggle.className="toggle-track"+(faceTrackingOn?" on":"");
        kioskToggle.className="toggle-track"+(kioskEnabled?" on":"");
        snapshotToggle.className="toggle-track"+(snapshotOn?" on":"");
        snapCountLabel.textContent=String(snapCount);
    }
    function closeMenu(){menuOpen=false;menuEl.classList.remove("open")}
    function tryOpenMenu(){
        if(kioskEnabled){openPasscode()}
        else{openMenu()}
    }

    moodGrid.addEventListener("click",function(e){
        var btn=e.target.closest(".mood-btn");if(!btn)return;
        var mood=btn.dataset.mood;
        closeMenu();
        setTimeout(function(){
            if(activeMood===mood) exitMood();
            else enterMood(mood);
        },120);
    });

    themeRow.addEventListener("click",function(e){var s=e.target.closest(".theme-swatch");if(s)setThemeByName(s.dataset.theme)});
    ccInput.addEventListener("input",function(){ccHex.value=ccInput.value});
    ccHex.addEventListener("input",function(){if(/^#[0-9a-fA-F]{6}$/.test(ccHex.value))ccInput.value=ccHex.value});
    ccApply.addEventListener("click",function(){setCustomColor(ccHex.value||ccInput.value)});

    imuToggle.addEventListener("click",function(){imuEnabled=!imuEnabled;imuToggle.className="toggle-track"+(imuEnabled?" on":"")});
    faceToggle.addEventListener("click",function(){
        faceTrackingOn=!faceTrackingOn;
        faceToggle.className="toggle-track"+(faceTrackingOn?" on":"");
        if(window.RobotConfig){
            if(faceTrackingOn) RobotConfig.startFaceTracking();
            else RobotConfig.stopFaceTracking();
        }
    });

    kioskToggle.addEventListener("click",function(){
        kioskEnabled=!kioskEnabled;
        kioskToggle.className="toggle-track"+(kioskEnabled?" on":"");
        if(window.RobotConfig) RobotConfig.setKioskEnabled(kioskEnabled);
    });

    setPasscodeBtn.addEventListener("click",function(){
        var v=passcodeInput.value.trim();
        if(v.length>=4){
            storedPasscode=v;
            if(window.RobotConfig) RobotConfig.setPasscode(v);
            passcodeInput.value="";passcodeInput.placeholder="Set \u2713";
            setTimeout(function(){passcodeInput.placeholder="1234"},1500);
        }
    });

    snapshotToggle.addEventListener("click",function(){
        snapshotOn=!snapshotOn;
        snapshotToggle.className="toggle-track"+(snapshotOn?" on":"");
        if(window.RobotConfig) RobotConfig.setSnapshotEnabled(snapshotOn);
    });

    clearSnapsBtn.addEventListener("click",function(){
        if(window.RobotConfig){RobotConfig.clearSnapshots();snapCount=0;snapCountLabel.textContent="0"}
    });

    var refreshBtn=document.getElementById("refreshEyes");
    refreshBtn.addEventListener("click",function(){resetEyes();closeMenu()});
    closeBtn.addEventListener("click",closeMenu);
    menuEl.addEventListener("click",function(e){if(e.target===menuEl)closeMenu()});

    // ===== LONG PRESS =====
    ctr.addEventListener("touchstart",function(e){
        if(menuOpen)return;longPressTriggered=false;
        longPressTimer=setTimeout(function(){longPressTriggered=true;tryOpenMenu()},600);
    });
    ctr.addEventListener("touchend",function(){if(longPressTimer){clearTimeout(longPressTimer);longPressTimer=null}touchActive=false});
    ctr.addEventListener("touchmove",function(e){if(longPressTimer&&!longPressTriggered){clearTimeout(longPressTimer);longPressTimer=null}},{passive:true});

    // ===== GAZE =====
    function pushGaze(x,y,dur){
        x=clamp(x,-MAX_GAZE,MAX_GAZE);y=clamp(y,-MAX_GAZE,MAX_GAZE);
        var h=hold();
        var d=dur||0.08;
        G().then(function(){
            gsap.to(irises,{x:x,y:y+(h.iY||0),duration:d,ease:"power2.out",overwrite:true});
            // Pupil shifts slightly ahead of iris for depth realism
            var px=x*0.15,py=y*0.12;
            gsap.to(pupils,{x:px,y:py,duration:d*0.8,ease:"power2.out",overwrite:true});
        });
    }

    function browFollowGaze(gx,gy){
        if(isAnimating||activeMood) return;
        G().then(function(){
            var by=clamp(gy*-0.3,-6,6),lr=clamp(gx*0.15,-5,5),rr=clamp(gx*-0.15,-5,5);
            var af=clamp(-gy*0.02,-0.15,0.15);
            var a=60+af*30,b=30-af*15,c=100+af*40,d=60+af*20;
            gsap.to(L.brow,{y:by,rotation:lr,borderRadius:a+"% "+b+"% 14% 20%/"+c+"% "+d+"% 22% 30%",duration:0.12,ease:"power2.out",overwrite:true});
            gsap.to(R.brow,{y:by,rotation:rr,borderRadius:b+"% "+a+"% 20% 14%/"+d+"% "+c+"% 30% 22%",duration:0.12,ease:"power2.out",overwrite:true});
        });
    }

    // Touch gaze
    ctr.addEventListener("touchmove",function(e){
        if(menuOpen||longPressTriggered)return;e.preventDefault();touchActive=true;
        var t=e.touches[0];
        var px=((t.clientX/window.innerWidth)-0.5)*52,py=((t.clientY/window.innerHeight)-0.5)*52;
        pushGaze(px,py,0.05);browFollowGaze(px,py);
    },{passive:false});

    ctr.addEventListener("touchstart",function(e){
        if(menuOpen)return;touchActive=true;
        if(e.touches.length===1&&!longPressTriggered){
            var t=e.touches[0];
            var px=((t.clientX/window.innerWidth)-0.5)*52,py=((t.clientY/window.innerHeight)-0.5)*52;
            pushGaze(px,py,0.05);browFollowGaze(px,py);
        }
    });

    document.addEventListener("mousemove",function(e){
        if(menuOpen)return;
        var px=((e.clientX/window.innerWidth)-0.5)*52,py=((e.clientY/window.innerHeight)-0.5)*52;
        pushGaze(px,py,0.06);browFollowGaze(px,py);
    });

    // ===== IMU =====
    function onIMU(ax,ay,gx,gy){
        if(!imuEnabled)return;imuActive=true;
        var tH=clamp(ay/4,-1,1)*MAX_GAZE,tV=clamp(ax/4,-1,1)*MAX_GAZE;
        var fH=clamp(gy*3,-8,8),fV=clamp(gx*3,-8,8);
        var ix=clamp(tH+fH,-MAX_GAZE,MAX_GAZE),iy=clamp(tV+fV,-MAX_GAZE,MAX_GAZE);
        if(!touchActive&&!isAnimating&&!menuOpen&&!faceTrackingOn){pushGaze(ix,iy,0.06);browFollowGaze(ix,iy)}
    }

    // ===== FACE TRACKING =====
    var faceLostTid=null;
    var lastFaceDetected=false;
    var moodCycleTid=null;
    var CYCLE_MOODS=["joy","sadness","anger","surprise","fear","confusion","love","excitement","sleepy","disgust"];
    var moodCycleIdx=0;

    function startMoodCycle(){
        stopMoodCycle();
        moodCycleTid=setInterval(function(){
            if(!faceTrackingOn||menuOpen)return;
            moodCycleIdx=(moodCycleIdx+1)%CYCLE_MOODS.length;
            enterMood(CYCLE_MOODS[moodCycleIdx]);
        },7000+Math.random()*4000);
    }
    function stopMoodCycle(){if(moodCycleTid){clearInterval(moodCycleTid);moodCycleTid=null}}

    // Reactive override: temporarily switch mood, resume cycle after timeout
    var reactiveTid=null;
    var reactingTo=null;
    var lastEulerY=0;
    var prevSmile=0;

    function reactMood(mood,durMs){
        if(reactingTo===mood) return;
        reactingTo=mood;
        stopMoodCycle();
        enterMood(mood);
        if(reactiveTid) clearTimeout(reactiveTid);
        reactiveTid=setTimeout(function(){
            reactiveTid=null;
            reactingTo=null;
            startMoodCycle();
        },durMs||3500);
    }

    function onFace(detected,eulerX,eulerY,eulerZ,eyeL,eyeR,smile,cx,cy){
        if(!faceTrackingOn)return;

        if(!detected){
            if(lastFaceDetected){
                lastFaceDetected=false;
                // Face lost → go sleepy, then idle after a while
                reactMood("sleepy",4000);
                if(!faceLostTid) faceLostTid=setTimeout(function(){
                    faceLostTid=null;
                    if(!lastFaceDetected){stopMoodCycle();exitMood()}
                },8000);
            }
            return;
        }

        // Face just appeared → surprise then start cycling
        if(!lastFaceDetected){
            lastFaceDetected=true;
            if(faceLostTid){clearTimeout(faceLostTid);faceLostTid=null}
            reactMood("surprise",2500);
        }

        // Gaze following — exaggerated at edges for convincing tracking
        var rawH=(0.5-cx)*90 + eulerY*0.8;
        var rawV=(cy-0.5)*60 - eulerX*0.45;
        var gazeH=Math.sign(rawH)*Math.pow(Math.min(Math.abs(rawH)/45,1),0.7)*45;
        var gazeV=Math.sign(rawV)*Math.pow(Math.min(Math.abs(rawV)/45,1),0.7)*45;
        if(!touchActive&&!isAnimating&&!menuOpen) pushGaze(gazeH,gazeV,0.08);

        // Blink mirroring
        if(eyeL<0.2&&eyeR<0.2&&!isAnimating) singleBlink();

        // --- Reactive expressions (override cycle temporarily) ---

        // Smile → joy
        if(smile>0.7&&prevSmile<0.5&&reactingTo!=="joy"){
            reactMood("joy",3500);
        }
        prevSmile=smile;

        // Rapid head turn → surprise (euler Y change > 12 deg since last frame)
        var dY=Math.abs(eulerY-lastEulerY);
        if(dY>12&&reactingTo!=="surprise"){
            reactMood("surprise",2500);
        }

        // Looking way down (euler X > 20) → sleepy
        if(eulerX>20&&reactingTo!=="sleepy"){
            reactMood("sleepy",3000);
        }

        // Head tilted hard (euler Z > 18) → confusion
        if(Math.abs(eulerZ)>18&&reactingTo!=="confusion"){
            reactMood("confusion",3000);
        }

        // Eyes wide but not smiling → fear/surprise
        if(eyeL>0.9&&eyeR>0.9&&smile<0.3&&reactingTo!=="fear"&&reactingTo!=="surprise"){
            reactMood("fear",2500);
        }

        lastEulerY=eulerY;
    }

    function onFaceTrackingStatus(ok){
        faceTrackingOn=ok;
        faceToggle.className="toggle-track"+(ok?" on":"");
        if(!ok){stopMoodCycle();if(activeMood)exitMood()}
    }

    // ===== RESET =====
    function resetEyes() {
        stopEmphasis();
        stopMoodCycle();
        activeMood = null;
        currentHold = null;
        isAnimating = false;
        touchActive = false;
        imuActive = false;
        if (reactiveTid) { clearTimeout(reactiveTid); reactiveTid = null; }
        reactingTo = null;
        lastFaceDetected = false;
        if (faceLostTid) { clearTimeout(faceLostTid); faceLostTid = null; }

        G().then(function() {
            gsap.killTweensOf(eyes);
            gsap.killTweensOf(brows);
            gsap.killTweensOf(irises);
            gsap.killTweensOf(pupils);
            gsap.killTweensOf(L.brow);
            gsap.killTweensOf(R.brow);

            gsap.set(eyes, {scaleY:1, scaleX:1, borderRadius:"50%", y:0, x:0, rotation:0});
            gsap.set(brows, {y:0, scaleY:1, scaleX:1, rotation:0, x:0});
            gsap.set(L.brow, {borderRadius:REST_BR.left, rotation:0});
            gsap.set(R.brow, {borderRadius:REST_BR.right, rotation:0});
            gsap.set(irises, {x:0, y:0});
            gsap.set(pupils, {x:0, y:0});

            Object.keys(moodBtns).forEach(function(k){ moodBtns[k].className = "mood-btn"; });

            scheduleBlink();
            scheduleBrowIdle();
        });
    }

    // ===== IDLE BROW =====
    function idleBrowTwitch(){
        if(isAnimating||activeMood){scheduleBrowIdle();return}
        G().then(function(){
            var p=Math.random(),dur=0.4+Math.random()*0.3;
            if(p<0.2){
                gsap.timeline()
                    .to(brows,{y:-4-Math.random()*6,scaleY:1.1,duration:dur,ease:"power2.out"})
                    .to(L.brow,{borderRadius:"70% 25% 14% 20%/120% 70% 22% 30%",duration:dur},0)
                    .to(R.brow,{borderRadius:"25% 70% 20% 14%/70% 120% 30% 22%",duration:dur},0)
                    .to(brows,{y:0,scaleY:1,duration:dur*0.8})
                    .to(L.brow,{borderRadius:REST_BR.left,duration:dur*0.8},"<")
                    .to(R.brow,{borderRadius:REST_BR.right,duration:dur*0.8},"<").then(scheduleBrowIdle);
            } else if(p<0.4){
                var u=Math.random()>0.5;
                gsap.timeline()
                    .to(L.brow,{y:u?-8:3,rotation:u?3:-4,borderRadius:u?"75% 20% 14% 18%/130% 50% 22% 28%":"45% 35% 14% 20%/70% 50% 22% 30%",duration:dur,ease:"power2.out"},0)
                    .to(R.brow,{y:u?3:-8,rotation:u?4:-3,borderRadius:u?"35% 45% 18% 14%/50% 70% 28% 22%":"20% 75% 20% 14%/50% 130% 30% 22%",duration:dur,ease:"power2.out"},0)
                    .to(brows,{y:0,rotation:0,scaleY:1,duration:dur*0.8})
                    .to(L.brow,{borderRadius:REST_BR.left,duration:dur*0.8},"<")
                    .to(R.brow,{borderRadius:REST_BR.right,duration:dur*0.8},"<").then(scheduleBrowIdle);
            } else if(p<0.6){
                var w=Math.random()>0.5?L.brow:R.brow;
                gsap.timeline().to(w,{y:-5,duration:0.12}).to(w,{y:0,duration:0.15}).then(scheduleBrowIdle);
            } else { scheduleBrowIdle() }
        });
    }
    function scheduleBrowIdle(){if(browIdleTid)clearTimeout(browIdleTid);browIdleTid=setTimeout(idleBrowTwitch,2000+Math.random()*4000)}

    // ===== IDLE GAZE =====
    function idleLook(){
        if(isAnimating||touchActive||(imuEnabled&&imuActive)||menuOpen||faceTrackingOn)return;
        var rx=(Math.random()-0.5)*28,ry=(Math.random()-0.5)*18;
        if(Math.random()<0.3){rx=0;ry=0}
        pushGaze(rx,ry,0.3);browFollowGaze(rx,ry);
    }
    setInterval(function(){imuActive=false},3000);
    setInterval(idleLook,2800+Math.random()*2000);

    // ===== BLINK (respects mood hold) =====
    function singleBlink(){
        var h=hold();
        return G().then(function(){
            return gsap.timeline()
                .to(brows,{y:(h.browY||0)+5,scaleY:(h.browSY||1)*0.6,duration:0.06},0)
                .to(eyes,{scaleY:0.04,duration:0.06},0)
                .to(eyes,{scaleY:h.eSY||1,duration:0.08},0.06)
                .to(brows,{y:h.browY||0,scaleY:h.browSY||1,duration:0.08},0.06);
        });
    }
    function doubleBlink(){
        var h=hold();
        return G().then(function(){
            return gsap.timeline()
                .to(brows,{y:(h.browY||0)+5,scaleY:(h.browSY||1)*0.6,duration:0.06},0)
                .to(eyes,{scaleY:0.04,duration:0.06},0)
                .to(eyes,{scaleY:h.eSY||1,duration:0.06},0.06)
                .to(brows,{y:h.browY||0,scaleY:h.browSY||1,duration:0.06},0.06)
                .to(brows,{y:(h.browY||0)+5,scaleY:(h.browSY||1)*0.6,duration:0.06},0.22)
                .to(eyes,{scaleY:0.04,duration:0.06},0.22)
                .to(eyes,{scaleY:h.eSY||1,duration:0.06},0.28)
                .to(brows,{y:h.browY||0,scaleY:h.browSY||1,duration:0.06},0.28);
        });
    }
    function blink(){if(isAnimating){scheduleBlink();return}(Math.random()<0.6?singleBlink():doubleBlink()).then(scheduleBlink)}
    function scheduleBlink(){if(blinkTid)clearTimeout(blinkTid);blinkTid=setTimeout(blink,1500+Math.random()*4000)}

    scheduleBlink();
    scheduleBrowIdle();

    // ===== ONE-SHOT EMOTIONS (for WebSocket API) =====
    function emote(fn){
        if(isAnimating)return;isAnimating=true;
        fn().then(function(){isAnimating=false;scheduleBlink();scheduleBrowIdle()});
    }
    function expressJoy(){return G().then(function(){return gsap.timeline().to(brows,{y:-14,scaleY:1.3,duration:0.2},0).to(eyes,{borderRadius:"50% 50% 25% 25%",scaleY:0.65,duration:0.2},0).to(eyes,{y:"-=8",duration:0.1,yoyo:true,repeat:3},0.2).to(eyes,{borderRadius:"50%",scaleY:hold().eSY||1,y:0,duration:0.3}).to(brows,{y:hold().browY||0,scaleY:hold().browSY||1,duration:0.3},"<")})}
    function runOneShot(name){
        var map={joy:expressJoy};
        if(map[name]) emote(map[name]);
    }

    // ===== EXTERNAL API =====
    function moveEyes(sx,sy,reg){var w=window.innerWidth,h=window.innerHeight;if(reg){sx*=w;sy*=h}pushGaze(((sx/w)-0.5)*52,((sy/h)-0.5)*52,0.15)}
    function moveEyesTarget(x,y,z,fl){fl=fl||1000;pushGaze(clamp((x/(z+fl))*80,-MAX_GAZE,MAX_GAZE),clamp((y/(z+fl))*80,-MAX_GAZE,MAX_GAZE),0.15)}

    // ===== WEBSOCKET =====
    var ws,RECON_MS=[5000,10000,20000,40000,80000],rIdx=0,rTid=null;
    function startWS(addr,port,proto){
        port=port||8765;proto=proto||"wss";
        if(ws&&ws.readyState!==WebSocket.CLOSED)ws.close();
        ws=new WebSocket((proto==="wss"?"wss":"ws")+"://"+addr+":"+port);
        ws.onopen=function(){rIdx=0;if(rTid){clearTimeout(rTid);rTid=null}};
        ws.onmessage=function(ev){
            var p=ev.data.split(" ");
            if(p[0]==="emotion"){
                if(HOLDS[p[1]]) enterMood(p[1]);
                else runOneShot(p[1]);
            }
            else if(p[0]==="theme"&&p[1])setThemeByName(p[1]);
            else if(p[0]==="eye"&&p[1]==="target"&&p.length===6)moveEyesTarget(+p[2],+p[3],+p[4],+p[5]);
            else if(p[0]==="eye"&&p.length===3)moveEyes(+p[1],+p[2],true);
            else if(p[0]==="neutral")exitMood();
        };
        ws.onclose=function(){schedR(addr,port,proto)};ws.onerror=function(){schedR(addr,port,proto)};
    }
    var cfg={};
    function schedR(a,p,pr){cfg={a:a,p:p,pr:pr};if(rTid){clearTimeout(rTid);rTid=null}if(rIdx>=RECON_MS.length)return;var d=RECON_MS[rIdx++];rTid=setTimeout(function(){rTid=null;if(ws.readyState===WebSocket.CLOSED)startWS(cfg.a,cfg.p,cfg.pr)},d)}

    // ===== PUBLIC API =====
    // ===== BATTERY INDICATOR =====
    var batEl=document.createElement("div");
    batEl.id="batteryIndicator";
    batEl.style.cssText="position:fixed;top:6px;right:10px;font:500 11px/1 system-ui,sans-serif;color:rgba(255,255,255,0.25);z-index:5;pointer-events:none";
    document.body.appendChild(batEl);
    var batPct=100,batCharging=false;
    function updateBatUI(){
        var icon=batCharging?"\u26A1":"";
        var col=batPct<=15?"rgba(255,60,60,0.6)":batPct<=30?"rgba(255,180,0,0.5)":"rgba(255,255,255,0.25)";
        batEl.style.color=col;
        batEl.textContent=icon+batPct+"%";
    }
    updateBatUI();

    window.eyes={
        websocket:startWS,emotion:function(e){if(HOLDS[e])enterMood(e);else runOneShot(e)},
        neutral:exitMood,move:moveEyes,target:moveEyesTarget,
        theme:setThemeByName,cycleTheme:function(){themeIdx=(themeIdx+1)%THEME_ORDER.length;setThemeByName(THEME_ORDER[themeIdx])},
        customColor:setCustomColor,imu:onIMU,face:onFace,
        faceTrackingStatus:onFaceTrackingStatus,menu:tryOpenMenu,
        onSnapshotCount:function(c){snapCount=c;snapCountLabel.textContent=String(c)},
        onBattery:function(pct,charging){batPct=pct;batCharging=charging;updateBatUI()},
        reset:resetEyes
    };

    // Load persisted settings from bridge
    setTimeout(function(){
        if(!window.RobotConfig)return;
        try{kioskEnabled=!!RobotConfig.isKioskEnabled()}catch(e){}
        try{storedPasscode=RobotConfig.getPasscode()||"1234"}catch(e){}
        try{snapshotOn=!!RobotConfig.isSnapshotEnabled()}catch(e){}
        try{snapCount=RobotConfig.getSnapshotCount()||0}catch(e){}
    },500);

    // Auto-connect
    (function(){var h=document.querySelector('meta[name="websocket-host"]');if(!h)return;var host=h.getAttribute("content")||"localhost";var pm=document.querySelector('meta[name="websocket-port"]');var port=pm?parseInt(pm.getAttribute("content"),10)||8765:8765;var prm=document.querySelector('meta[name="websocket-protocol"]');var proto=(prm&&prm.getAttribute("content"))||"ws";startWS(host,port,proto)})();
})();
