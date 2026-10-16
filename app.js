/* 화면 보조. 라이브러리를 싣지 않는다(폐쇄망이라 CDN 을 못 쓴다).
   모달은 조각 URL 을 받아 채워 넣고, 일괄 처리는 체크된 ID 를 폼에 실어 보낸다.
   폼에는 action 과 method 가 남아 있어 스크립트가 없어도 동작한다. */

function picked() {
  return [...document.querySelectorAll('.rowchk:checked')].map(c => c.value);
}

function syncPicked() {
  const boxes = [...document.querySelectorAll('.rowchk')];
  const n = boxes.filter(c => c.checked).length;
  const el = document.getElementById('picked-n');
  if (el) el.textContent = n ? n + '건 선택' : '고른 문항 없음';
  /* 일부만 골랐으면 머리글 체크박스를 중간 표시로 둔다 */
  const all = document.getElementById('chkall');
  if (all) {
    all.checked = boxes.length > 0 && n === boxes.length;
    all.indeterminate = n > 0 && n < boxes.length;
  }
}

function checkAll(on) {
  document.querySelectorAll('.rowchk').forEach(c => { c.checked = on; });
  syncPicked();
}

/* 일괄 폼은 제출 직전에 체크된 ID 를 채운다. 하나도 없으면 보내지 않는다. */
function fillIds() {
  const ids = picked();
  if (!ids.length) { alert('문항을 먼저 고르십시오.'); return false; }
  document.getElementById('bulk-ids').value = ids.join(',');
  return true;
}

async function openModal(url) {
  const back = document.getElementById('modal-back');
  const box = document.getElementById('modal');
  box.innerHTML = '<div class="muted">불러오는 중…</div>';
  back.hidden = false;
  document.body.style.overflow = 'hidden';
  try {
    const r = await fetch(url, { headers: { 'X-Requested-With': 'fetch' } });
    box.innerHTML = await r.text();
    syncCart();
  } catch (e) {
    box.innerHTML = '<div class="muted">불러오지 못했습니다: ' + e + '</div>';
  }
}

function closeModal(ev) {
  if (ev && ev.target !== ev.currentTarget) return;
  document.getElementById('modal-back').hidden = true;
  document.getElementById('modal').innerHTML = '';
  document.body.style.overflow = '';
  if (cartDirty) { cartDirty = false; refreshRows(); }
}

/* ── 바구니 ──
   빼기·비우기를 그냥 제출하면 페이지가 다시 로드되면서 모달이 닫힌다.
   여러 건을 뺄 때 열고 닫기를 되풀이하게 되므로 그 자리에서 갈아 끼운다. */

let cartDirty = false;   /* 모달을 닫을 때 뒤 목록을 다시 그려야 하는가 */

async function cartPost(form) {
  const box = document.getElementById('modal');
  try {
    const r = await fetch(form.action, {
      method: 'POST',
      headers: { 'X-Requested-With': 'fetch' },
      body: new FormData(form),
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    box.innerHTML = await r.text();
    cartDirty = true;
    syncRail(box);
    syncCart();
  } catch (e) {
    form.onsubmit = null;          /* 안 되면 종전 방식으로라도 */
    form.submit();
  }
}

/* 담긴 것 전부가 아니라 고른 것만 평가지로 보낸다 */
function cartPicked() {
  return [...document.querySelectorAll('.cartchk:checked')].map(c => c.value);
}

function cartCheckAll(on) {
  document.querySelectorAll('.cartchk').forEach(c => { c.checked = on; });
  syncCart();
}

function syncCart() {
  const boxes = [...document.querySelectorAll('.cartchk')];
  if (!boxes.length) return;                 /* 바구니 화면이 아니다 */
  const n = boxes.filter(c => c.checked).length;
  const all = document.getElementById('cartall');
  if (all) {
    all.checked = n === boxes.length;
    all.indeterminate = n > 0 && n < boxes.length;
  }
  const lab = document.getElementById('cart-picked');
  if (lab) {
    lab.textContent = n === boxes.length ? `${n}건 전부`
                    : (n ? `${n}건 선택` : '고른 문항이 없습니다');
  }
  const mk = document.getElementById('mkpaper');
  if (mk) mk.disabled = n === 0;
  const mkbox = document.getElementById('mkbox');
  const note = document.getElementById('mk-note');
  if (note && mkbox && !mkbox.hidden) {
    note.textContent = n ? `고른 ${n}건으로 만듭니다` : '고른 문항이 없습니다';
  }
  const rm = document.querySelector('#rmpicked button');
  if (rm) rm.disabled = n === 0;
}

function showPaperName() {
  const ids = cartPicked();
  if (!ids.length) { alert('평가지에 넣을 문항을 고르십시오.'); return; }
  const box = document.getElementById('mkbox');
  box.hidden = false;
  document.getElementById('mk-note').textContent =
    `고른 ${ids.length}건으로 만듭니다`;
  const t = box.querySelector('[name=title]');
  t.focus(); t.select();
}

function hidePaperName() {
  document.getElementById('mkbox').hidden = true;
}

function fillPaperIds(form) {
  const ids = cartPicked();
  if (!ids.length) { alert('평가지에 넣을 문항을 고르십시오.'); return false; }
  form.querySelector('[name=ids]').value = ids.join(',');
  return true;                     /* 평범한 제출. 평가지 목록으로 넘어간다 */
}

function cartRemovePicked(form) {
  const ids = cartPicked();
  if (!ids.length) return;
  form.querySelector('[name=ids]').value = ids.join(',');
  cartPost(form);
}

/* 바구니 숫자는 화면을 다시 열 때 맞춰진다(왼쪽 메뉴). 예전 세로 띠 자리 */
function syncRail(box) {}

/* 바구니에서 뺀 문항은 목록에서 다시 [담기]가 되어야 한다 */
async function refreshRows() {
  const tb = document.getElementById('rows');
  if (!tb) return;
  const keep = new Set(picked());
  try {
    const r = await fetch(location.pathname + location.search,
                          { headers: { 'X-Requested-With': 'fetch' } });
    tb.innerHTML = await r.text();
    document.querySelectorAll('.rowchk').forEach(c => {
      c.checked = keep.has(c.value);
    });
    syncPicked();
  } catch (e) { /* 다음 이동 때 맞춰진다 */ }
}

/* ── 작업 목록 ──
   도는 작업이 있으면 2초, 없으면 15초 간격으로 다시 읽는다. 화면 개편(2026-10-16)
   뒤로 떠 있는 알림 창은 없고, 왼쪽 메뉴의 '작업 현황' 숫자와 작업 현황 화면을 맞춘다. */

let jobTimer = null;
let jobsDone = -1;       /* 끝난 작업 수. 늘면 목록을 다시 그린다 */

async function pollJobs() {
  const box = document.getElementById('joblist');
  if (!box) return;
  clearTimeout(jobTimer);                /* 여러 곳에서 불러도 타이머는 하나 */
  try {
    const r = await fetch('/jobs', { headers: { 'X-Requested-With': 'fetch' } });
    box.innerHTML = await r.text();
  } catch (e) { /* 한 번 놓쳐도 다음 차례에 다시 본다 */ }

  const sum = box.querySelector('#job-sum');
  const n = k => sum ? +(sum.dataset[k] || 0) : 0;
  const run = n('run'), q = n('q'), fail = n('fail'), done = n('done');
  const busy = run + q;

  const badge = document.getElementById('nav-jobs');
  if (badge) {
    badge.textContent = busy ? String(busy) : '';
    badge.classList.toggle('live', busy > 0);
  }
  /* 작업 현황 화면이면 본문을 다시 그린다 */
  const work = document.getElementById('work');
  if (work && (busy || jobsDone < 0 || done + fail !== jobsDone)) {
    try {
      const r = await fetch('/work', { headers: { 'X-Requested-With': 'fetch' } });
      work.innerHTML = await r.text();
    } catch (e) { /* 다음 차례에 */ }
  }
  /* 작업이 끝나면 뒤 화면도 맞춘다. 목록이면 행을, 생성 화면이면 보유 수를. */
  if (jobsDone >= 0 && done + fail > jobsDone) {
    refreshRows();
    if (typeof onJobsChanged === 'function') onJobsChanged();
  }
  jobsDone = done + fail;
  jobTimer = setTimeout(pollJobs, busy ? 2000 : 15000);
}

/* ── 목록 미리보기 ── 줄을 누르면 오른쪽에 문항과 검증 요약을 보인다 */
async function preview(id, row) {
  const box = document.getElementById('preview');
  if (!box || !id) return;
  document.querySelectorAll('#rows tr.sel').forEach(r => r.classList.remove('sel'));
  const tr = row || document.querySelector(`#rows tr[data-id="${id}"]`);
  if (tr) tr.classList.add('sel');
  box.innerHTML = '<p class="muted">불러오는 중…</p>';
  try {
    const r = await fetch('/items/' + id + '/preview',
                          { headers: { 'X-Requested-With': 'fetch' } });
    box.innerHTML = await r.text();
  } catch (e) {
    box.innerHTML = '<p class="muted">불러오지 못했습니다: ' + e + '</p>';
  }
}

function rowClick(ev, tr) {
  /* 체크박스, 단추, 링크를 누른 것은 미리보기로 가로채지 않는다 */
  if (ev.target.closest('input, button, a, form')) return;
  preview(tr.dataset.id, tr);
}

/* 취소·끝난 작업 지우기도 페이지를 다시 로드하지 않는다 */
async function jobPost(form) {
  try {
    const r = await fetch(form.action, {
      method: 'POST', headers: { 'X-Requested-With': 'fetch' },
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    document.getElementById('joblist').innerHTML = await r.text();
    jobsDone = -1;   /* 작업 현황 화면을 바로 다시 그린다 */
    pollJobs();      /* 다시 넣은 작업이 있으면 2초 간격으로 읽기 시작한다 */
  } catch (e) {
    form.onsubmit = null;
    form.submit();
  }
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});
document.addEventListener('DOMContentLoaded', () => {
  syncPicked();
  pollJobs();
});

/* 사람 검수. 결정을 남기고 상세 조각만 다시 그린다. 모달을 닫으면 목록도 맞춘다. */
async function reviewPost(form) {
  const box = document.getElementById('modal');
  try {
    const r = await fetch(form.action, {
      method: 'POST', headers: { 'X-Requested-With': 'fetch' },
      body: new FormData(form),
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    box.innerHTML = await r.text();
    cartDirty = true;                    /* 닫을 때 뒤 목록을 다시 그린다 */
  } catch (e) {
    form.onsubmit = null;
    form.submit();
  }
}
