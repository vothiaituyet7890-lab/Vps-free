console.log('🟠 admin-assign.js loaded');

async function fetchJSON(url, opts={}){
  const r = await fetch(url, opts); return r.json();
}

document.addEventListener('DOMContentLoaded', () => {
  const dateEl = document.getElementById('assignDate');
  if (dateEl && !dateEl.value) dateEl.valueAsDate = new Date();
  document.getElementById('btnReloadAssign')?.addEventListener('click', loadAll);
  document.getElementById('btnCreateAssign')?.addEventListener('click', createAssign);
  loadAll();
});

async function loadAll(){
  const date = document.getElementById('assignDate').value || new Date().toISOString().slice(0,10);
  // Load staff
  const nv = await fetchJSON('api/nhanvien.php');
  const selNV = document.getElementById('selNhanVien');
  selNV.innerHTML = '<option value="">Chọn nhân viên</option>' + (nv.nhanvien||[]).map(x=>`<option value="${x.id_nv}">${escapeHtml(x.ho_ten||('NV#'+x.id_nv))}</option>`).join('');
  // Load ca
  const ca = await fetchJSON('api/catruc.php');
  const selCa = document.getElementById('selCa');
  selCa.innerHTML = '<option value="">Chọn ca</option>' + (ca.shifts||[]).map(x=>`<option value="${x.ma_ca}">${x.ma_ca} - ${x.ten_ca} (${x.gio_bat_dau}-${x.gio_ket_thuc})</option>`).join('');
  // Load courts (optional)
  let courts=[]; try{ courts = await fetchJSON('api/courts.php'); }catch(e){}
  const selSan = document.getElementById('selSan');
  selSan.innerHTML = '<option value="">Chọn sân (tuỳ chọn)</option>' + (courts||[]).map(c=>`<option value="${c.id||c.id_san}">${escapeHtml(c.name||c.ten_san||('S'+(c.id||'')))}</option>`).join('');
  await loadAssignments(date);
  await loadCancelRequests();
}

async function loadAssignments(date){
  const data = await fetchJSON(`api/phancong.php?ngay=${encodeURIComponent(date)}`);
  const assigns = data.assignments||[];
  const tbody = document.querySelector('#assignTable tbody');
  tbody.innerHTML = '';
  if (!assigns.length){ tbody.innerHTML = '<tr><td colspan="6">Chưa có phân công</td></tr>'; return; }
  assigns.forEach(a=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${a.ma_ca}</td>
      <td>${a.ten_ca}</td>
      <td>${a.gio_bat_dau} - ${a.gio_ket_thuc}</td>
      <td>${escapeHtml(a.ho_ten||('NV#'+a.id_nv))}</td>
      <td>${a.id_san||'-'}</td>
      <td><button class="btn btn-danger btn-sm" onclick="deleteAssign(${a.id})">Xóa</button></td>
    `;
    tbody.appendChild(tr);
  });
}

async function createAssign(){
  const date = document.getElementById('assignDate').value || new Date().toISOString().slice(0,10);
  const id_nv = parseInt(document.getElementById('selNhanVien').value||'0',10);
  const ma_ca = document.getElementById('selCa').value;
  const id_san = document.getElementById('selSan').value;
  if (!id_nv || !ma_ca){ alert('Chọn nhân viên và ca'); return; }
  const resp = await fetchJSON('api/phancong.php', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id_nv, ma_ca, ngay_truc: date, id_san }) });
  if (resp && resp.success){ await loadAssignments(date); } else { alert(resp.message||'Không thể tạo phân công'); }
}

async function deleteAssign(id){
  const date = document.getElementById('assignDate').value || new Date().toISOString().slice(0,10);
  if (!confirm('Xóa phân công này?')) return;
  const resp = await fetchJSON(`api/phancong.php?id=${id}`, { method:'DELETE' });
  if (resp && resp.success){ await loadAssignments(date); } else { alert(resp.message||'Không thể xóa'); }
}

async function loadCancelRequests(){
  const data = await fetchJSON('api/phancong-cancel.php?status=pending');
  const items = data.requests||[];
  const tbody = document.querySelector('#cancelReqTable tbody');
  tbody.innerHTML = '';
  if (!items.length){ tbody.innerHTML = '<tr><td colspan="6">Không có yêu cầu</td></tr>'; return; }
  items.forEach(r=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.id_nv}</td>
      <td>${r.ngay_truc}</td>
      <td>${r.ma_ca}</td>
      <td>${escapeHtml(r.reason)}</td>
      <td>${r.status}</td>
      <td>
        <button class="btn btn-primary btn-sm" onclick="reviewCancel(${r.id}, 'approve')">Duyệt</button>
        <button class="btn btn-secondary btn-sm" onclick="reviewCancel(${r.id}, 'reject')">Từ chối</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function reviewCancel(id, action){
  const resp = await fetchJSON(`api/phancong-cancel.php?id=${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action }) });
  if (resp && resp.success){ await loadCancelRequests(); } else { alert(resp.message||'Không thể cập nhật'); }
}

function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
