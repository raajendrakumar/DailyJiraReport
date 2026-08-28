(function(){
  "use strict";

  var DEFAULT_DATA = JSON.parse(document.getElementById('board-data').textContent);
  var current = DEFAULT_DATA;
  var openState = Object.create(null);

  function esc(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  function initials(name){
    if(!name || name === 'Unassigned') return '?';
    var parts = name.trim().split(/\s+/);
    var s = parts[0][0] || '';
    if(parts.length > 1) s += parts[parts.length-1][0];
    return s.toUpperCase();
  }

  function priorityColor(p){
    p = (p||'').toLowerCase();
    if(p === 'highest') return 'var(--critical)';
    if(p === 'high') return 'var(--warning)';
    if(p === 'low' || p === 'lowest') return 'var(--good)';
    return 'var(--neutral-chip)';
  }

  function statusColor(s){
    s = (s||'').toLowerCase();
    if(s.indexOf('progress') !== -1) return 'var(--accent)';
    if(s.indexOf('review') !== -1 || s.indexOf('qa') !== -1) return 'var(--warning)';
    if(s.indexOf('block') !== -1) return 'var(--critical)';
    return 'var(--neutral-chip)';
  }

  function computeStats(data){
    var stories = 0, bugs = 0, named = 0, hasUnassigned = false;
    data.forEach(function(p){
      stories += p.stories.length;
      bugs += p.bugs.length;
      if(p.name === 'Unassigned'){ hasUnassigned = true; } else { named++; }
    });
    return {stories:stories, bugs:bugs, total:stories+bugs, assignees:named, hasUnassigned:hasUnassigned};
  }

  function renderStats(data){
    var s = computeStats(data);
    document.getElementById('stat-stories').textContent = s.stories;
    document.getElementById('stat-bugs').textContent = s.bugs;
    document.getElementById('stat-total').textContent = s.total;
    document.getElementById('stat-assignees').textContent = s.assignees;
    document.getElementById('stat-assignees-sub').textContent = s.hasUnassigned ? 'Named owners (+ Unassigned)' : 'Named owners';
  }

  function renderWorkload(data){
    var card = document.getElementById('workload-card');
    if(!data.length){
      card.innerHTML = '<div class="empty-state">No open Stories or Bugs in this export.</div>';
      return;
    }
    var maxTotal = Math.max.apply(null, data.map(function(p){ return p.stories.length + p.bugs.length; }));
    if(maxTotal <= 0) maxTotal = 1;
    var rows = data.map(function(p){
      var st = p.stories.length, bg = p.bugs.length, total = st + bg;
      var pct = Math.max(total / maxTotal * 100, total > 0 ? 4 : 0);
      var segs = '';
      if(st > 0){
        segs += '<div class="bar-seg story ' + (bg === 0 ? 'only-seg' : 'first-seg') + '" style="flex:' + st + ' 0 0" title="' + st + ' Stories"></div>';
      }
      if(bg > 0){
        segs += '<div class="bar-seg bug ' + (st === 0 ? 'only-seg' : 'last-seg') + '" style="flex:' + bg + ' 0 0" title="' + bg + ' Bugs"></div>';
      }
      var nameCls = p.name === 'Unassigned' ? 'workload-name unassigned' : 'workload-name';
      return '<div class="workload-row">' +
        '<div class="' + nameCls + '">' + esc(p.name) + '</div>' +
        '<div class="bar-track" style="width:' + pct.toFixed(1) + '%">' + segs + '</div>' +
        '<div class="workload-total">' + total + '</div>' +
        '</div>';
    }).join('');
    card.innerHTML = rows;
  }

  function ticketRow(t, itype){
    var dotColor = itype === 'Story' ? 'var(--story)' : 'var(--bug)';
    return '<tr>' +
      '<td><span class="key-link mono">' + esc(t.key) + '</span></td>' +
      '<td class="summary-cell">' +
        '<span class="type-pill"><span class="dot" style="background:' + dotColor + '"></span>' + itype + '</span> ' +
        esc(t.summary) +
      '</td>' +
      '<td><span class="priority-cell"><span class="prio-dot" style="background:' + priorityColor(t.priority) + '"></span>' + esc(t.priority || '&mdash;') + '</span></td>' +
      '<td><span class="status-cell"><span class="status-dot" style="background:' + statusColor(t.status) + '"></span>' + esc(t.status || '&mdash;') + '</span></td>' +
      '<td class="due-cell mono">' + (t.due || 0) + 'd</td>' +
      '</tr>';
  }

  function renderAssigneeList(data, filter){
    var list = document.getElementById('assignee-list');
    var q = (filter || '').trim().toLowerCase();
    var matches = data.filter(function(p){ return !q || p.name.toLowerCase().indexOf(q) !== -1; });

    document.getElementById('result-count').textContent = q ? (matches.length + ' of ' + data.length + ' shown') : (data.length + ' assignees');

    if(!matches.length){
      list.innerHTML = '<div class="empty-state">No assignee matches &ldquo;' + esc(filter) + '&rdquo;.</div>';
      return;
    }

    list.innerHTML = matches.map(function(p, idx){
      var total = p.stories.length + p.bugs.length;
      var allTickets = p.stories.map(function(t){ return {t:t, itype:'Story'}; })
        .concat(p.bugs.map(function(t){ return {t:t, itype:'Bug'}; }))
        .sort(function(a,b){ return (b.t.due||0) - (a.t.due||0); });
      var rowsHtml = allTickets.map(function(x){ return ticketRow(x.t, x.itype); }).join('');
      var isOpen = !!openState[p.name] || (q && matches.length === 1);
      return '<div class="assignee-card' + (isOpen ? ' open' : '') + '" data-name="' + esc(p.name) + '">' +
        '<button type="button" class="assignee-head" aria-expanded="' + isOpen + '">' +
          '<span class="assignee-id">' +
            '<span class="assignee-avatar">' + initials(p.name) + '</span>' +
            '<span class="assignee-name">' + esc(p.name) + '</span>' +
          '</span>' +
          '<span class="assignee-counts">' +
            '<span class="count-chip"><span class="dot" style="background:var(--story)"></span>' + p.stories.length + '</span>' +
            '<span class="count-chip"><span class="dot" style="background:var(--bug)"></span>' + p.bugs.length + '</span>' +
            '<span class="count-chip">' + total + ' total</span>' +
          '</span>' +
          '<span class="chevron" aria-hidden="true">&#10148;</span>' +
        '</button>' +
        '<div class="assignee-body">' +
          '<div class="table-scroll"><table class="tickets">' +
            '<thead><tr><th>Key</th><th>Summary</th><th>Priority</th><th>Status</th><th>Open</th></tr></thead>' +
            '<tbody>' + rowsHtml + '</tbody>' +
          '</table></div>' +
        '</div>' +
      '</div>';
    }).join('');

    Array.prototype.forEach.call(list.querySelectorAll('.assignee-head'), function(btn){
      btn.addEventListener('click', function(){
        var card = btn.closest('.assignee-card');
        var name = card.getAttribute('data-name');
        var willOpen = !card.classList.contains('open');
        card.classList.toggle('open', willOpen);
        btn.setAttribute('aria-expanded', String(willOpen));
        openState[name] = willOpen;
      });
    });
  }

  function renderAll(data){
    renderStats(data);
    renderWorkload(data);
    renderAssigneeList(data, document.getElementById('assignee-search').value);
  }

  document.getElementById('assignee-search').addEventListener('input', function(e){
    renderAssigneeList(current, e.target.value);
  });

  document.getElementById('upload-btn').addEventListener('click', function(){
    document.getElementById('file-input').click();
  });

  function parseCSV(text){
    var rows = [];
    var row = [];
    var field = '';
    var inQuotes = false;
    for(var i=0;i<text.length;i++){
      var c = text[i];
      if(inQuotes){
        if(c === '"'){
          if(text[i+1] === '"'){ field += '"'; i++; } else { inQuotes = false; }
        } else { field += c; }
      } else {
        if(c === '"'){ inQuotes = true; }
        else if(c === ','){ row.push(field); field=''; }
        else if(c === '\r'){ /* skip */ }
        else if(c === '\n'){ row.push(field); rows.push(row); row=[]; field=''; }
        else { field += c; }
      }
    }
    if(field.length || row.length){ row.push(field); rows.push(row); }
    if(!rows.length) return [];
    var header = rows[0].map(function(h){ return h.replace(/^﻿/, '').trim(); });
    return rows.slice(1).filter(function(r){ return r.length > 1 || (r[0]||'').trim() !== ''; }).map(function(r){
      var obj = {};
      header.forEach(function(h, idx){ obj[h] = r[idx] != null ? r[idx] : ''; });
      return obj;
    });
  }

  function groupRows(rows){
    var people = Object.create(null);
    rows.forEach(function(row){
      var itype = String(row['Issue Type'] || '').trim();
      if(itype !== 'Story' && itype !== 'Bug') return;
      var assignee = String(row['Assignee'] || '').trim() || 'Unassigned';
      var dueRaw = String(row['Due Days'] == null ? '' : row['Due Days']).trim();
      var due = /^-?\d+$/.test(dueRaw) ? parseInt(dueRaw, 10) : 0;
      var entry = {
        key: String(row['Issue key'] || '').trim(),
        summary: String(row['Summary'] || '').trim(),
        priority: String(row['Priority'] || '').trim(),
        status: String(row['Status'] || '').trim(),
        due: due
      };
      if(!people[assignee]) people[assignee] = {name:assignee, stories:[], bugs:[]};
      if(itype === 'Story') people[assignee].stories.push(entry); else people[assignee].bugs.push(entry);
    });
    var named = Object.keys(people).filter(function(k){ return k !== 'Unassigned'; })
      .map(function(k){ return people[k]; })
      .sort(function(a,b){ return (b.stories.length+b.bugs.length) - (a.stories.length+a.bugs.length); });
    if(people['Unassigned']) named.push(people['Unassigned']);
    return named;
  }

  document.getElementById('file-input').addEventListener('change', function(e){
    var file = e.target.files && e.target.files[0];
    if(!file) return;
    var name = file.name.toLowerCase();
    var reader = new FileReader();
    reader.onload = function(ev){
      try{
        var rows;
        if(name.endsWith('.csv')){
          rows = parseCSV(String(ev.target.result));
        } else {
          var wb = XLSX.read(ev.target.result, {type:'array'});
          var sheetName = wb.SheetNames.indexOf('Jira') !== -1 ? 'Jira' : wb.SheetNames[0];
          rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {defval:''});
        }
        var grouped = groupRows(rows);
        current = grouped;
        openState = Object.create(null);
        document.getElementById('assignee-search').value = '';
        renderAll(current);
        document.getElementById('preview-filename').textContent = file.name;
        document.getElementById('preview-banner').classList.add('active');
      } catch(err){
        alert('Could not read "' + file.name + '". Make sure it is a Jira export with a Jira sheet (or CSV) containing Issue Type, Issue key, Summary, Assignee, Priority, Status, and Due Days columns.\n\n' + err.message);
      }
      document.getElementById('file-input').value = '';
    };
    if(name.endsWith('.csv')){ reader.readAsText(file); } else { reader.readAsArrayBuffer(file); }
  });

  document.getElementById('reset-preview').addEventListener('click', function(){
    current = DEFAULT_DATA;
    openState = Object.create(null);
    document.getElementById('assignee-search').value = '';
    document.getElementById('preview-banner').classList.remove('active');
    renderAll(current);
  });

  renderAll(current);
})();
