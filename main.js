// ==========================================
//  馬茲提卡 - 多檔案載入引擎 (V18.6 除錯修正版)
// ==========================================

const navBtns = document.querySelectorAll('.nav-btn');
const contentContainer = document.getElementById('dynamic-content');
const scrollView = document.getElementById('scroll-view');
const pageCache = {};

// 定義所有可搜尋的頁面清單 (請確保檔名正確)
const ALL_PAGES = [
  { file: 'create', name: '創角流程' },
  { file: 'kin', name: '種族' },
  { file: 'profession', name: '職業' },
  { file: 'skill', name: '技能' },
  { file: 'combat', name: '戰鬥與傷害' },
  { file: 'equipment', name: '裝備與物品' },
  { file: 'abilities', name: '英雄能力' },
  { file: 'journey', name: '旅行規則' },
  { file: 'history', name: '歷史與傳說' },
  { file: 'locations', name: '地理誌' },
  { file: 'magic', name: '魔法與法術' },
  { file: 'farming', name: '農業與烹飪' },
  { file: 'forging', name: '鍛造與強化' },
  { file: 'academy', name: '三聖學' },
  { file: 'carriage', name: '馬車與載具' },
  { file: 'calendar', name: '馬茲提卡曆法' }
];

// 1. 主選單切換
navBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    navBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadPage(btn.getAttribute('data-file'));
  });
});

async function loadPage(fileName) {
  gsap.to(contentContainer, { opacity: 0, y: 10, duration: 0.2 });

  try {
    let htmlContent;
    if (pageCache[fileName]) {
      htmlContent = pageCache[fileName];
    } else {
      const response = await fetch(`pages/${fileName}.html`);
      if (!response.ok) throw new Error("檔案找不到");
      htmlContent = await response.text();
      pageCache[fileName] = htmlContent;
    }

    setTimeout(() => {
      contentContainer.innerHTML = htmlContent;
      scrollView.scrollTop = 0;

      bindAnchors();
      
      // === 頁面初始化邏輯 ===
      if (fileName === 'kin') initTabs('.index-btn[data-target]', 'race-section');
      else if (fileName === 'profession') {
        initTabs('.index-btn[data-target]', 'prof-section');
        initTabs('.epoch-btn[data-target]', 'epoch-section');
      }
      else if (fileName === 'magic') initMagicPage();
      else if (fileName === 'farming') initFarmingPage();
      else if (fileName === 'equipment') initEquipmentPage();
      else if (fileName === 'combat') initCombatPage();
      else if (fileName === 'journey') initJourneyPage(); 
else if (fileName === 'academy') initAcademyPage();   // 三聖學
      else if (fileName === 'carriage') initCarriagePage(); // 馬車
      else if (fileName === 'calendar') initCalendarPage(); // 曆法

      gsap.fromTo(contentContainer, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" });
    }, 200);

  } catch (error) {
    console.error(error);
    contentContainer.innerHTML = `<div class="error-msg"><h2>讀取錯誤</h2><p>無法載入 pages/${fileName}.html</p></div>`;
    gsap.to(contentContainer, { opacity: 1, duration: 0.3 });
  }
}

// 2. ★ 全站搜尋功能
function initGlobalSearch() {
  const searchInput = document.getElementById('global-search');
  if (!searchInput) return;

  searchInput.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      const keyword = searchInput.value.trim();
      if (!keyword) return;

      const originalPlaceHolder = searchInput.placeholder;
      searchInput.placeholder = "搜尋中...";
      searchInput.value = "";
      
      const results = await performSearch(keyword);
      showSearchResults(results, keyword);
      
      searchInput.placeholder = originalPlaceHolder;
    }
  });
}

async function performSearch(keyword) {
  const results = [];
  const lowerKeyword = keyword.toLowerCase();

  for (const page of ALL_PAGES) {
    let content = "";
    if (pageCache[page.file]) {
      content = pageCache[page.file];
    } else {
      try {
        const res = await fetch(`pages/${page.file}.html`);
        if (res.ok) {
          content = await res.text();
          pageCache[page.file] = content;
        }
      } catch (err) {
        console.warn(`無法搜尋頁面: ${page.file}`);
      }
    }

    if (content) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'text/html');
      const textNodes = doc.querySelectorAll('h2, h3, h4, p, li, td');
      
      textNodes.forEach(node => {
        const text = node.textContent;
        if (text.toLowerCase().includes(lowerKeyword)) {
          const index = text.toLowerCase().indexOf(lowerKeyword);
          const snippetStart = Math.max(0, index - 20);
          const snippetEnd = Math.min(text.length, index + 50);
          let snippet = text.substring(snippetStart, snippetEnd);
          
          results.push({
            pageFile: page.file,
            pageName: page.name,
            title: findParentHeader(node) || page.name,
            snippet: snippet,
            fullText: text
          });
        }
      });
    }
  }
  return results;
}

function findParentHeader(node) {
  let prev = node.previousElementSibling;
  while (prev) {
    if (['H2', 'H3', 'H4'].includes(prev.tagName)) return prev.textContent;
    prev = prev.previousElementSibling;
  }
  return null;
}

function showSearchResults(results, keyword) {
  const GOLD = '#c9a35a';
  const oldModal = document.getElementById('search-result-modal');
  if (oldModal) oldModal.remove();

  const modalEl = document.createElement('div');
  modalEl.id = 'search-result-modal';
  Object.assign(modalEl.style, {
    position: 'fixed', inset: '0', width: '100vw', height: '100vh',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', zIndex: '9999',
    opacity: '0', transition: 'opacity .25s ease'
  });

  const card = document.createElement('div');
  Object.assign(card.style, {
    position: 'relative', width: 'min(90vw, 600px)', maxHeight: '80vh', overflowY: 'auto',
    background: 'rgba(20,20,25,0.98)', border: `2px solid ${GOLD}`, borderRadius: '12px',
    boxShadow: `0 0 30px rgba(0,0,0,0.8)`, padding: '20px', color: '#f4f1ea'
  });

  const header = document.createElement('h2');
  header.innerHTML = `搜尋結果: "<span style="color:${GOLD}">${keyword}</span>" (${results.length} 筆)`;
  header.style.borderBottom = `1px solid rgba(255,255,255,0.1)`;
  header.style.paddingBottom = '10px';
  header.style.marginTop = '0';

  const list = document.createElement('div');
  
  if (results.length === 0) {
    list.innerHTML = `<p style="text-align:center; padding:20px; color:#888;">沒有找到相關資料。</p>`;
  } else {
    results.slice(0, 20).forEach(res => {
      const item = document.createElement('div');
      item.className = 'search-result-item';
      const highlightedSnippet = res.snippet.replace(new RegExp(keyword, 'gi'), match => `<span class="search-highlight">${match}</span>`);
      item.innerHTML = `<div class="search-result-title">【${res.pageName}】${res.title}</div><div class="search-result-snippet">...${highlightedSnippet}...</div>`;
      item.addEventListener('click', () => {
        modalEl.style.opacity = '0';
        setTimeout(() => modalEl.remove(), 200);
        const btn = document.querySelector(`.nav-btn[data-file="${res.pageFile}"]`);
        if (btn) btn.click();
        else loadPage(res.pageFile);
      });
      list.appendChild(item);
    });
  }

  const closeBtn = document.createElement('span');
  closeBtn.textContent = '×';
  Object.assign(closeBtn.style, {
    position: 'absolute', right: '15px', top: '10px', color: GOLD, fontSize: '30px', cursor: 'pointer', lineHeight: '1'
  });
  closeBtn.onclick = () => { modalEl.remove(); };

  card.appendChild(closeBtn);
  card.appendChild(header);
  card.appendChild(list);
  modalEl.appendChild(card);
  document.body.appendChild(modalEl);

  requestAnimationFrame(() => { modalEl.style.opacity = '1'; });
  modalEl.onclick = (e) => { if (e.target === modalEl) modalEl.remove(); };
}

// 3. 通用 Tab 切換功能 (V19.2 層級修復版)
function initTabs(btnSelector, sectionClass) {
  const tabBtns = contentContainer.querySelectorAll(btnSelector);
  const sections = contentContainer.querySelectorAll('.' + sectionClass);
  if (tabBtns.length === 0) return;

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // 1. UI 狀態切換
      const parentNav = btn.closest('.index-links, .epoch-nav, .school-flex-container, .combat-main-nav') || btn.parentElement;
      if (parentNav) parentNav.querySelectorAll(btnSelector).forEach(b => b.classList.remove('active-tab'));
      btn.classList.add('active-tab');
      
      // 2. 顯示對應區塊
      sections.forEach(sec => sec.classList.remove('active'));
      const targetId = btn.getAttribute('data-target');
      const targetSection = document.getElementById(targetId);
      
      if (targetSection) {
        targetSection.classList.add('active');
        gsap.fromTo(targetSection, {opacity: 0, y: 5}, {opacity: 1, y: 0, duration: 0.2});

        // ★★★ 關鍵修復：只在「第一層導覽列」中尋找按鈕 ★★★
        // 我們先找到該區塊內的「第一個導覽列容器」(combat-sub-nav)
        // 這樣可以避免直接抓到深層(Level 3)的按鈕
        const subNav = targetSection.querySelector('.combat-sub-nav');
        
        if (subNav) {
          // 在這個導覽列範圍內找「上次被激活的」或「第一個」按鈕
          const activeSubBtn = subNav.querySelector('.sub-tab-btn.active-sub-tab');
          const firstSubBtn = subNav.querySelector('.sub-tab-btn');
          
          if (activeSubBtn) {
              activeSubBtn.click();
          } else if (firstSubBtn) {
              firstSubBtn.click();
          }
        }
      }
    });
  });
}

// 4. 戰鬥頁面初始化 (V19.3 強制刷新版)
function initCombatPage() {
  // Level 1: 主分頁切換
  initTabs('.main-tab-btn', 'main-section');

  // Level 2 & 3: 子分頁切換
  const subBtns = contentContainer.querySelectorAll('.sub-tab-btn');
  subBtns.forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation(); // 防止冒泡
      
      // 1. UI 變色
      const nav = this.parentElement;
      nav.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active-sub-tab'));
      this.classList.add('active-sub-tab');

      // 2. 內容切換
      const sectionContainer = nav.parentElement; 
      
      // 隱藏該層級下的所有內容
      const allContents = sectionContainer.querySelectorAll('.combat-sub-content');
      allContents.forEach(el => {
        // 確保只隱藏直屬的子內容
        if (el.parentElement === sectionContainer) {
            el.style.display = 'none';
        }
      });

      // 3. 顯示目標
      const targetId = this.getAttribute('data-target');
      const targetEl = sectionContainer.querySelector(`#${targetId}`);
      if(targetEl) {
        targetEl.style.display = 'block';
        gsap.fromTo(targetEl, {opacity: 0, y: 5}, {opacity: 1, y: 0, duration: 0.2});

        // ★★★ 關鍵修復：強制刷新下一層 ★★★
        // 無論有沒有被激活，都要點擊一下，確保內容顯示出來
        const innerNav = targetEl.querySelector('.combat-sub-nav');
        if (innerNav) {
          const activeInner = innerNav.querySelector('.active-sub-tab');
          const firstBtn = innerNav.querySelector('.sub-tab-btn');
          
          // 如果已經有激活的按鈕，就重點一次它；如果沒有，就點第一個
          if (activeInner) {
            activeInner.click();
          } else if (firstBtn) {
            firstBtn.click();
          }
        }
      }
    });
  });

  // Level 0: 預設觸發
  document.querySelectorAll('.combat-content-box').forEach(box => {
    const firstNav = box.querySelector('.combat-sub-nav');
    if(firstNav) {
      const firstBtn = firstNav.querySelector('.sub-tab-btn');
      if(firstBtn && !firstNav.querySelector('.active-sub-tab')) {
        firstBtn.click();
      }
    }
  });
}

// 5. 魔法頁面初始化
function initMagicPage() {
  initTabs('.index-btn[data-target]', 'magic-section'); 
  initTabs('.epoch-btn[data-target]', 'rule-content');
  
  const bookmarkBtns = contentContainer.querySelectorAll('.bookmark-btn');
  bookmarkBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      const nav = this.parentElement;
      nav.querySelectorAll('.bookmark-btn').forEach(b => b.classList.remove('active-sub-tab'));
      this.classList.add('active-sub-tab');
      const contentArea = nav.nextElementSibling;
      if(contentArea) {
         contentArea.querySelectorAll('.rule-card').forEach(c => c.classList.remove('active'));
         const targetId = this.getAttribute('data-show');
         const targetCard = contentArea.querySelector(`#${targetId}`);
         if(targetCard) {
           targetCard.classList.add('active');
           gsap.fromTo(targetCard, {opacity: 0, y: 5}, {opacity: 1, y: 0, duration: 0.3});
         }
      }
    });
  });

  const schoolBtns = contentContainer.querySelectorAll('.school-btn');
  schoolBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      schoolBtns.forEach(b => b.classList.remove('active-tab'));
      btn.classList.add('active-tab');
      const schoolSections = contentContainer.querySelectorAll('.school-content');
      schoolSections.forEach(sec => sec.classList.remove('active'));
      const targetId = btn.getAttribute('data-target');
      const targetSection = document.getElementById(targetId);
      
      if (targetSection) {
        targetSection.classList.add('active');
        const sourceFile = btn.getAttribute('data-src');
        if (sourceFile && targetSection.innerHTML.trim() === "") {
          targetSection.innerHTML = `<div class="placeholder">正在讀取...</div>`;
          try {
            const res = await fetch(sourceFile);
            if (!res.ok) throw new Error("Load failed");
            const html = await res.text();
            targetSection.innerHTML = html;
            
            // ★ 關鍵修復：讀取後初始化技能樹
            initSpellNodes(targetSection);
            
          } catch (err) {
            targetSection.innerHTML = `<div class="placeholder" style="color:red;">Error: ${err.message}</div>`;
          }
        } else {
          // 如果已經載入過，檢查是否有技能樹需要重繪
          const spellSection = targetSection.querySelector('.spell-section');
          if (spellSection) redrawTree(spellSection);
        }
      }
    });
  });
  const activeBtn = contentContainer.querySelector('.school-btn.active-tab');
  if(activeBtn) activeBtn.click();
}

// 6. ★★★ 技能樹核心邏輯 (修復版) ★★★
function initSpellNodes(section) {
  const treeContainer = section.querySelector('.skilltree');
  if (!treeContainer) return;

  const dataNodes = treeContainer.querySelectorAll('.spell-data');
  dataNodes.forEach(data => {
    const name = data.getAttribute('data-name');
    const req = data.getAttribute('data-req');
    const parentCol = data.parentElement;

    const btn = document.createElement('div');
    btn.className = 'skill-node';
    btn.textContent = name;
    btn.dataset.req = req;
    btn.dataset.name = name;

    btn.addEventListener('click', () => {
      // 移除其他激活狀態
      treeContainer.querySelectorAll('.skill-node').forEach(n => n.classList.remove('active'));
      btn.classList.add('active');
      
      // 顯示詳情
      showSpellDetail(data, section);
      
      // 重繪連線
      redrawTree(section);

      // ★ 新增：自動捲動到下方詳情面板
      const panel = section.querySelector('.spell-detail-panel') || section.parentElement.querySelector('.spell-detail-panel');
      if (panel) {
        // 使用 setTimeout 確保內容渲染完後再捲動
        setTimeout(() => {
          panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    });

    parentCol.appendChild(btn);
    // 隱藏原始資料
    data.style.display = 'none';
  });

  // 2. 初始繪製連線
  setTimeout(() => redrawTree(section), 100);
  
  // 監聽視窗大小改變重繪
  window.addEventListener('resize', () => redrawTree(section));
}

function redrawTree(section) {
  const svg = section.querySelector('.skilltree-svg');
  const wrapper = section.querySelector('.skilltree-wrap');
  if (!svg || !wrapper) return;

  // 清空舊連線
  svg.innerHTML = '';
  
  // 設定 SVG 大小匹配容器
  const rect = wrapper.getBoundingClientRect();
  svg.setAttribute('width', wrapper.scrollWidth);
  svg.setAttribute('height', wrapper.scrollHeight);

  const nodes = Array.from(section.querySelectorAll('.skill-node'));
  const nameMap = {};
  nodes.forEach(n => nameMap[n.dataset.name] = n);

  nodes.forEach(node => {
    const reqs = node.dataset.req ? node.dataset.req.split(',') : [];
    reqs.forEach(reqName => {
      const target = nameMap[reqName.trim()];
      if (target) {
        drawConnection(svg, target, node, wrapper);
      }
    });
  });
}

function drawConnection(svg, startNode, endNode, wrapper) {
  const p1 = getCenter(startNode, wrapper);
  const p2 = getCenter(endNode, wrapper);

  // 判斷是否激活
  const isActive = endNode.classList.contains('active');

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  
  const c1 = { x: p1.x, y: (p1.y + p2.y) / 2 };
  const c2 = { x: p2.x, y: (p1.y + p2.y) / 2 };
  
  const d = `M ${p1.x} ${p1.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p2.x} ${p2.y}`;
  
  path.setAttribute("d", d);
  path.setAttribute("class", isActive ? "connection active" : "connection");
  svg.appendChild(path);
}

function getCenter(el, wrapper) {
  const r = el.getBoundingClientRect();
  const w = wrapper.getBoundingClientRect();
  return {
    x: (r.left + r.width / 2) - w.left + wrapper.scrollLeft,
    y: (r.top + r.height / 2) - w.top + wrapper.scrollTop
  };
}

function showSpellDetail(dataNode, section) {
  const panel = section.querySelector('.spell-detail-panel') || section.parentElement.querySelector('.spell-detail-panel');
  if (!panel) return;

  // 1. 填入內容
  panel.innerHTML = dataNode.innerHTML;
  
  // 2. 建立「返回技能樹」按鈕
  const backBtn = document.createElement('button');
  backBtn.className = 'scroll-back-btn'; 
  backBtn.innerHTML = '⬆ 返回技能樹';
  
  // 3. 按鈕點擊事件：捲動回樹狀圖
  backBtn.onclick = () => {
    const treeWrap = section.querySelector('.skilltree-wrap');
    if (treeWrap) {
      treeWrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // 4. 將按鈕插入到面板最下方
  panel.appendChild(backBtn);

  // 關閉按鈕
  const close = document.createElement('div');
  close.className = 'back-to-tree';
  close.innerText = '✕ 關閉';
  close.onclick = () => {
    panel.innerHTML = '<div class="placeholder">請點擊上方技能節點查看詳情</div>';
    section.querySelectorAll('.skill-node').forEach(n => n.classList.remove('active'));
    redrawTree(section);
    // 關閉時也滾回上方
    const treeWrap = section.querySelector('.skilltree-wrap');
    if (treeWrap) treeWrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  panel.appendChild(close);
}

// 7. 其他頁面初始化
function initFarmingPage() {
  initTabs('.epoch-btn[data-target]', 'rule-content');
  initGlobalPopups(); 
}

function initEquipmentPage() {
  initTabs('.epoch-btn[data-target]', 'rule-content');
  const subTabBtns = contentContainer.querySelectorAll('.sub-tab-btn');
  subTabBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      const nav = this.parentElement;
      nav.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active-sub-tab'));
      this.classList.add('active-sub-tab');
      const displayArea = this.closest('.rule-display-area');
      displayArea.querySelectorAll('.sub-list-content').forEach(el => el.style.display = 'none');
      const targetId = this.getAttribute('data-show');
      const targetEl = displayArea.querySelector(`#${targetId}`);
      if(targetEl) {
        targetEl.style.display = 'block';
        gsap.fromTo(targetEl, {opacity: 0, y: 5}, {opacity: 1, y: 0, duration: 0.3});
      }
    });
  });
  initGlobalPopups();
}

function initGlobalPopups() {
  const GOLD = '#c9a35a';
  let modalEl = null;
  function openPortalModal({ title, desc, img }) {
    if (modalEl) modalEl.remove();
    modalEl = document.createElement('div');
    Object.assign(modalEl.style, {
      position: 'fixed', inset: '0', width: '100vw', height: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', zIndex: '9999',
      opacity: '0', transition: 'opacity .25s ease'
    });
    const card = document.createElement('div');
    Object.assign(card.style, {
      position: 'relative', width: 'min(90vw, 500px)', maxHeight: '80vh', overflowY: 'auto',
      background: 'rgba(30,30,35,0.95)', border: `2px solid ${GOLD}`, borderRadius: '12px',
      boxShadow: `0 0 20px ${GOLD}40`, padding: '25px', color: '#f4f1ea', textAlign: 'center',
      transform: 'scale(0.95)', transition: 'transform .25s ease'
    });
    const closeBtn = document.createElement('span');
    closeBtn.textContent = '×';
    Object.assign(closeBtn.style, {
      position: 'absolute', right: '15px', top: '10px', color: GOLD, fontSize: '30px', cursor: 'pointer', lineHeight: '1'
    });
    const h2 = document.createElement('h2');
    h2.textContent = title;
    Object.assign(h2.style, { color: GOLD, marginBottom: '15px', marginTop: '10px', fontSize: '1.5rem', fontFamily: 'Noto Serif TC' });
    const imgEl = document.createElement('img');
    if (img && img !== 'undefined') {
      imgEl.src = img;
      Object.assign(imgEl.style, { maxWidth: '100%', borderRadius: '8px', border: `1px solid ${GOLD}`, marginBottom: '15px' });
    }
    const p = document.createElement('p');
    p.textContent = desc;
    Object.assign(p.style, { lineHeight: '1.6', textAlign: 'justify', color: '#ddd' });
    card.append(closeBtn, h2, img ? imgEl : '', p);
    modalEl.appendChild(card);
    document.body.appendChild(modalEl);
    requestAnimationFrame(() => { modalEl.style.opacity = '1'; card.style.transform = 'scale(1)'; });
    const close = () => { modalEl.style.opacity = '0'; card.style.transform = 'scale(0.95)'; setTimeout(() => modalEl.remove(), 250); };
    closeBtn.onclick = close;
    modalEl.onclick = (e) => { if (e.target === modalEl) close(); };
  }
  contentContainer.querySelectorAll('.popup-trigger').forEach(el => {
    el.addEventListener('click', e => {
      openPortalModal({ title: el.dataset.title, desc: el.dataset.desc, img: el.dataset.img });
    });
  });
}

function bindAnchors() {
  const links = contentContainer.querySelectorAll('.bookmark-btn, .back-to-top');
  links.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('data-scroll');
      const target = document.querySelector(targetId);
      if(target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

// ★ 啟動搜尋監聽
document.addEventListener('DOMContentLoaded', () => {
  initGlobalSearch();
});

function initEquipmentPage() {
  // 1. 初始化上方年代/分類 Tab (負重、武器、護甲...)
  initTabs('.epoch-btn[data-target]', 'rule-content');
  
  // 2. 初始化武器分類 Tab (徒手、斧、劍...)
  const subTabBtns = contentContainer.querySelectorAll('.sub-tab-btn:not(.prop-tab-btn)'); // ★ 排除新的屬性標籤
  subTabBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      const nav = this.parentElement;
      nav.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active-sub-tab'));
      this.classList.add('active-sub-tab');
      const displayArea = this.closest('.rule-display-area');
      // 只隱藏武器列表 (.sub-list-content)，不隱藏屬性內容 (.prop-content)
      displayArea.querySelectorAll('.sub-list-content').forEach(el => el.style.display = 'none');
      const targetId = this.getAttribute('data-show');
      const targetEl = displayArea.querySelector(`#${targetId}`);
      if(targetEl) {
        targetEl.style.display = 'block';
        gsap.fromTo(targetEl, {opacity: 0, y: 5}, {opacity: 1, y: 0, duration: 0.3});
      }
    });
  });

  // 3. ★ 新增：武器特性卡片內部的切換邏輯
  const propBtns = contentContainer.querySelectorAll('.prop-tab-btn');
  propBtns.forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation(); // 防止冒泡
      const nav = this.parentElement;
      const card = this.closest('.rule-card'); // 限定範圍在卡片內
      
      // UI 變色
      nav.querySelectorAll('.prop-tab-btn').forEach(b => b.classList.remove('active-sub-tab'));
      this.classList.add('active-sub-tab');
      
      // 內容切換
      card.querySelectorAll('.prop-content').forEach(el => el.style.display = 'none');
      const targetId = this.getAttribute('data-target');
      const targetEl = card.querySelector(`#${targetId}`);
      
      if(targetEl) {
        targetEl.style.display = 'block';
        gsap.fromTo(targetEl, {opacity: 0, x: -10}, {opacity: 1, x: 0, duration: 0.2});
      }
    });
  });

  initGlobalPopups();
}

// 8. 旅行頁面初始化 (新增)
function initJourneyPage() {
  // 1. 初始化主分頁 (時間、行軍、探路...)
  initTabs('.main-tab-btn', 'main-section');

  // 2. 初始化意外表分頁 (叢林、荒野、沼澤...)
  const mishapBtns = contentContainer.querySelectorAll('.sub-tab-btn');
  mishapBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      const nav = this.parentElement;
      nav.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active-sub-tab'));
      this.classList.add('active-sub-tab');
      
      const card = this.closest('.rule-card');
      if (card) {
        card.querySelectorAll('.sub-list-content').forEach(el => el.style.display = 'none');
        const targetId = this.getAttribute('data-show');
        const targetEl = card.querySelector(`#${targetId}`);
        if(targetEl) {
          targetEl.style.display = 'block';
          gsap.fromTo(targetEl, {opacity: 0, y: 5}, {opacity: 1, y: 0, duration: 0.3});
        }
      }
    });
  });
}
// ==========================================
// ★ 新增頁面的初始化函式
// ==========================================

// 1. 三聖學 (Academy)
function initAcademyPage() {
  // 學院頁面使用了兩種按鈕，我們都啟用
  initTabs('.index-btn[data-target]', 'magic-section'); 
  initTabs('.school-btn[data-target]', 'magic-section');
}

// 2. 馬車 (Carriage)
function initCarriagePage() {
  // ★ 修正：您的 HTML 是用 .index-btn，所以這裡要改成抓 .index-btn
  // 同時告訴程式，內容區塊的 class 是 rule-content
  initTabs('.index-btn[data-target]', 'rule-content');
}

// 3. 曆法 (Calendar) - 這是修正曆法空白的關鍵
function initCalendarPage() {
  // 強制執行曆法頁面內的 <script>
  // 因為 innerHTML 寫入的腳本預設不會跑，這裡要手動觸發
  const scripts = contentContainer.querySelectorAll('script');
  scripts.forEach(oldScript => {
    const newScript = document.createElement('script');
    // 複製屬性 (如 src)
    Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
    // 複製內容
    newScript.appendChild(document.createTextNode(oldScript.innerHTML));
    // 替換舊腳本以執行
    oldScript.parentNode.replaceChild(newScript, oldScript);
  });
}