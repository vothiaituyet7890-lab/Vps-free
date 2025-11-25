console.log('🟢 admin-ca.js loaded');

function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
async function getJSON(url, opts={}){ const r = await fetch(url, opts); return r.json(); }

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btnSaveShift')?.addEventListener('click', saveShift);
  loadShifts();
  loadCancelPending();
});

async function loadShifts(){
  const data = await getJSON('api/catruc.php');
  const rows = (data && data.shifts) ? data.shifts : [];
  const tb = document.querySelector('#shiftTable tbody');
  tb.innerHTML='';
  if (!rows.length){ tb.innerHTML='<tr><td colspan="4">Chưa có ca</td></tr>'; return; }
  rows.forEach(s=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(s.ma_ca)}</td>
      <td>${escapeHtml(s.ten_ca)}</td>
      <td>${s.gio_bat_dau} - ${s.gio_ket_thuc}</td>
      <td>
        <button class="btn btn-primary btn-sm" onclick="prefillShift('${s.ma_ca}','${escapeHtml(s.ten_ca)}','${s.gio_bat_dau}','${s.gio_ket_thuc}')">Sửa</button>
        <button class="btn btn-danger btn-sm" onclick="deleteShift('${s.ma_ca}')">Xóa</button>
      </td>`;
    tb.appendChild(tr);
  });
}

function prefillShift(ma, ten, bd, kt){
  document.getElementById('maCa').value = ma;
  document.getElementById('tenCa').value = ten;
  document.getElementById('gioBD').value = bd;
  document.getElementById('gioKT').value = kt;
}

async function saveShift(){
  const ma_ca = (document.getElementById('maCa').value||'').trim();
  const ten_ca = (document.getElementById('tenCa').value||'').trim();
  const gio_bat_dau = document.getElementById('gioBD').value;
  const gio_ket_thuc = document.getElementById('gioKT').value;
  if (!ma_ca || !ten_ca || !gio_bat_dau || !gio_ket_thuc){ alert('Điền đủ Mã/Tên ca và giờ'); return; }
  const resp = await getJSON('api/catruc.php', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ma_ca, ten_ca, gio_bat_dau, gio_ket_thuc })});
  if (resp && resp.success){ await loadShifts(); } else { alert(resp.message||'Không thể lưu ca'); }
}

async function deleteShift(ma){
  if (!confirm('Xóa ca này?')) return;
  const resp = await getJSON(`api/catruc.php?ma_ca=${encodeURIComponent(ma)}`, { method:'DELETE' });
  if (resp && resp.success){ await loadShifts(); } else { alert(resp.message||'Không thể xóa'); }
}

async function loadCancelPending(){
  const data = await getJSON('api/phancong-cancel.php?status=pending');
  const rows = (data && data.requests) ? data.requests : [];
  const tb = document.querySelector('#cancelManageTable tbody');
  tb.innerHTML='';
  if (!rows.length){ tb.innerHTML='<tr><td colspan="6">Không có yêu cầu</td></tr>'; return; }
  rows.forEach(r=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.id}</td>
      <td>${r.id_nv}</td>
      <td>${r.ngay_truc}</td>
      <td>${r.ma_ca}</td>
      <td>${escapeHtml(r.reason)}</td>
      <td>
        <button class="btn btn-primary btn-sm" onclick="reviewCancel(${r.id}, 'approve')">Duyệt</button>
        <button class="btn btn-secondary btn-sm" onclick="reviewCancel(${r.id}, 'reject')">Từ chối</button>
      </td>`;
    tb.appendChild(tr);
  });
}

async function reviewCancel(id, action){
  const resp = await getJSON(`api/phancong-cancel.php?id=${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action })});
  if (resp && resp.success){ await loadCancelPending(); } else { alert(resp.message||'Không thể cập nhật'); }
}
