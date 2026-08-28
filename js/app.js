(function(){
  "use strict";

  var AGE_WARN = 30;
  var AGE_CRITICAL = 90;
  var PRIORITY_ORDER = ['Highest', 'High', 'Medium', 'Low', 'Lowest'];

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

  function priorityRank(p){
    var i = PRIORITY_ORDER.indexOf(p);
    return i === -1 ? PRIORITY_ORDER.length : i;
  }

  function statusColor(s){
    s = (s||'').toLowerCase();
    if(s.indexOf('progress') !== -1) return 'var(--accent)';
    if(s.indexOf('review') !== -1 || s.indexOf('qa') !== -1) return 'var(--warning)';
    if(s.indexOf('block') !== -1) return 'var(--critical)';
    return 'var(--neutral-chip)';
  }

  function ageClass(due){
    due = due || 0;
    if(due >= AGE_CRITICAL) return 'due-critical';
    if(due >= AGE_WARN) return 'due-warn';
    return '';
  }

  function flatten(data){
    var out = [];
    data.forEach(function(p){
      p.stories.forEach(function(t){ out.push({t:t, itype:'Story', assignee:p.name}); });
      p.bugs.forEach(function(t){ out.push({t:t, itype:'Bug', assignee:p.name}); });
    });
    return out;
  }

  function computeStats(data){
    var stories = 0, bugs = 0, named = 0, hasUnassigned = false, aging = 0;
    data.forEach(function(p){
      stories += p.stories.length;
      bugs += p.bugs.length;
      if(p.name === 'Unassigned'){ hasUnassigned = true; } else { named++; }
      p.stories.concat(p.bugs).forEach(function(t){ if((t.due||0) >= AGE_CRITICAL) aging++; });
    });
    return {stories:stories, bugs:bugs, total:stories+bugs, assignees:named, hasUnassigned:hasUnassigned, aging:aging};
  }

  function renderStats(data){
    var s = computeStats(data);
    document.getElementById('stat-stories').textContent = s.stories;
    document.getElementById('stat-bugs').textContent = s.bugs;
    document.getElementById('stat-total').textContent = s.total;
    document.getElementById('stat-assignees').textContent = s.assignees;
    document.getElementById('stat-assignees-sub').textContent = s.hasUnassigned ? 'Named owners (+ Unassigned)' : 'Named owners';
    var agingEl = document.getElementById('stat-aging');
    agingEl.textContent = s.aging;
    agingEl.classList.toggle('alert', s.aging > 0);
  }

  function renderWorkload(data){
    var card = document.getElementById('workload-card');
    if(!data.length){
      card.innerHTML = '<div class="empty-state">No open Stories or Bugs match the current filters.</div>';
      return;
    }
    var maxTotal = Math.max.apply(null, data.map(function(p){ return p.stories.length + p.bugs.length; }));
    if(maxTotal <= 0) maxTotal = 1;
    var rows = data.map(function(p){
      var st = p.stories.length, bg = p.bugs.length, total = st + bg;
      var pct = Math.max(total / maxTotal * 100, total > 0 ? 4 : 0);
      var segs = '';
      if(st > 0){
        segs += '<div class="bar-seg story ' + (bg === 0 ? 'only-seg' : 'first-seg') + '" style="flex:' + st + ' 0 0" title="' + st + ' Stories"><span class="seg-count">' + st + '</span></div>';
      }
      if(bg > 0){
        segs += '<div class="bar-seg bug ' + (st === 0 ? 'only-seg' : 'last-seg') + '" style="flex:' + bg + ' 0 0" title="' + bg + ' Bugs"><span class="seg-count">' + bg + '</span></div>';
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

  function renderMiniBars(containerId, rows){
    var container = document.getElementById(containerId);
    if(!rows.length){
      container.innerHTML = '<div class="empty-state">No matching items.</div>';
      return;
    }
    var max = Math.max.apply(null, rows.map(function(r){ return r.count; }));
    if(max <= 0) max = 1;
    container.innerHTML = rows.map(function(r){
      var pct = Math.max(r.count / max * 100, r.count > 0 ? 4 : 0);
      return '<div class="workload-row">' +
        '<div class="workload-name">' + esc(r.label) + '</div>' +
        '<div class="bar-track" style="width:' + pct.toFixed(1) + '%"><div class="bar-seg only-seg" style="flex:1 0 0; background:' + r.color + '"></div></div>' +
        '<div class="workload-total">' + r.count + '</div>' +
        '</div>';
    }).join('');
  }

  function renderBreakdowns(data){
    var flat = flatten(data);
    var byPriority = Object.create(null);
    var byStatus = Object.create(null);
    flat.forEach(function(x){
      var p = x.t.priority || 'None';
      var s = x.t.status || 'None';
      byPriority[p] = (byPriority[p] || 0) + 1;
      byStatus[s] = (byStatus[s] || 0) + 1;
    });
    var priorityRows = PRIORITY_ORDER.filter(function(p){ return byPriority[p]; })
      .map(function(p){ return {label:p, count:byPriority[p], color:priorityColor(p)}; });
    Object.keys(byPriority).forEach(function(p){
      if(PRIORITY_ORDER.indexOf(p) === -1) priorityRows.push({label:p, count:byPriority[p], color:priorityColor(p)});
    });
    var statusRows = Object.keys(byStatus).map(function(s){
      return {label:s, count:byStatus[s], color:statusColor(s)};
    }).sort(function(a,b){ return b.count - a.count; });

    renderMiniBars('priority-breakdown', priorityRows);
    renderMiniBars('status-breakdown', statusRows);
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
      '<td class="due-cell mono ' + ageClass(t.due) + '">' + (t.due || 0) + 'd</td>' +
      '</tr>';
  }

  var SORTERS = {
    'age-desc': function(a,b){ return (b.t.due||0) - (a.t.due||0); },
    'age-asc': function(a,b){ return (a.t.due||0) - (b.t.due||0); },
    'priority': function(a,b){ return priorityRank(a.t.priority) - priorityRank(b.t.priority); },
    'key': function(a,b){ return (a.t.key||'').localeCompare(b.t.key||'', undefined, {numeric:true}); }
  };

  function renderAssigneeList(data, filter){
    var list = document.getElementById('assignee-list');
    var q = (filter || '').trim().toLowerCase();
    var matches = data.filter(function(p){ return !q || p.name.toLowerCase().indexOf(q) !== -1; });
    var sortValue = document.getElementById('sort-select').value;
    var sorter = SORTERS[sortValue] || SORTERS['age-desc'];

    document.getElementById('result-count').textContent = q ? (matches.length + ' of ' + data.length + ' shown') : (data.length + ' assignees');

    if(!matches.length){
      list.innerHTML = '<div class="empty-state">No assignee matches the current search and filters.</div>';
      return;
    }

    list.innerHTML = matches.map(function(p, idx){
      var total = p.stories.length + p.bugs.length;
      var agingCount = p.stories.concat(p.bugs).filter(function(t){ return (t.due||0) >= AGE_CRITICAL; }).length;
      var allTickets = p.stories.map(function(t){ return {t:t, itype:'Story'}; })
        .concat(p.bugs.map(function(t){ return {t:t, itype:'Bug'}; }))
        .sort(sorter);
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
            (agingCount > 0 ? '<span class="count-chip alert"><span class="dot" style="background:var(--critical)"></span>' + agingCount + ' aging</span>' : '') +
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

  function applyTicketFilters(data){
    var type = document.getElementById('type-filter').value;
    var priority = document.getElementById('priority-filter').value;
    var status = document.getElementById('status-filter').value;
    if(!type && !priority && !status) return data;
    function matches(t){
      return (!priority || t.priority === priority) && (!status || t.status === status);
    }
    return data.map(function(p){
      var stories = (type === 'Bug') ? [] : p.stories.filter(matches);
      var bugs = (type === 'Story') ? [] : p.bugs.filter(matches);
      return {name:p.name, stories:stories, bugs:bugs};
    }).filter(function(p){ return p.stories.length + p.bugs.length > 0; });
  }

  function populateStatusFilter(data){
    var sel = document.getElementById('status-filter');
    var prev = sel.value;
    var statuses = [];
    flatten(data).forEach(function(x){
      if(x.t.status && statuses.indexOf(x.t.status) === -1) statuses.push(x.t.status);
    });
    statuses.sort();
    sel.innerHTML = '<option value="">All statuses</option>' +
      statuses.map(function(s){ return '<option value="' + esc(s) + '">' + esc(s) + '</option>'; }).join('');
    if(statuses.indexOf(prev) !== -1) sel.value = prev;
  }

  function renderAll(){
    var filtered = applyTicketFilters(current);
    renderStats(filtered);
    renderBreakdowns(filtered);
    renderWorkload(filtered);
    renderAssigneeList(filtered, document.getElementById('assignee-search').value);
  }

  ['assignee-search', 'type-filter', 'priority-filter', 'status-filter', 'sort-select'].forEach(function(id){
    var el = document.getElementById(id);
    el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', renderAll);
  });

  document.getElementById('upload-btn').addEventListener('click', function(){
    document.getElementById('file-input').click();
  });

  document.getElementById('print-btn').addEventListener('click', function(){
    window.print();
  });

  function csvField(v){
    var s = String(v == null ? '' : v);
    if(/[",\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  document.getElementById('export-btn').addEventListener('click', function(){
    var filtered = applyTicketFilters(current);
    var q = document.getElementById('assignee-search').value.trim().toLowerCase();
    var rows = flatten(filtered).filter(function(x){ return !q || x.assignee.toLowerCase().indexOf(q) !== -1; });
    var header = ['Key', 'Type', 'Summary', 'Assignee', 'Priority', 'Status', 'Days Open'];
    var lines = [header.map(csvField).join(',')];
    rows.forEach(function(x){
      lines.push([x.t.key, x.itype, x.t.summary, x.assignee, x.t.priority, x.t.status, x.t.due || 0].map(csvField).join(','));
    });
    var blob = new Blob([lines.join('\r\n')], {type:'text/csv;charset=utf-8;'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'jira-report-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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

  function loadData(data){
    current = data;
    openState = Object.create(null);
    document.getElementById('assignee-search').value = '';
    document.getElementById('type-filter').value = '';
    document.getElementById('priority-filter').value = '';
    document.getElementById('sort-select').value = 'age-desc';
    populateStatusFilter(current);
    renderAll();
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
        loadData(grouped);
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
    loadData(DEFAULT_DATA);
    document.getElementById('preview-banner').classList.remove('active');
  });

  populateStatusFilter(current);
  renderAll();
})();
