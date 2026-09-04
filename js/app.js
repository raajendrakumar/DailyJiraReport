(function(){
  "use strict";

  var AGE_WARN = 30;
  var AGE_CRITICAL = 90;
  var PRIORITY_ORDER = ['Highest', 'High', 'Medium', 'Low', 'Lowest'];
  var JIRA_BASE_URL = 'https://truevaluehub.atlassian.net/browse/';

  var rawBoardData = document.getElementById('board-data');
  var DEFAULT_DATA = rawBoardData ? JSON.parse(rawBoardData.textContent) : [];
  var current = DEFAULT_DATA;
  var openState = Object.create(null);
  var activeAgingFilter = null; // null | 90 | 30

  // -------------------------------------------------------------
  // Theme Management
  // -------------------------------------------------------------
  function initTheme(){
    var savedTheme = localStorage.getItem('tvh_theme') || 'system';
    applyTheme(savedTheme);

    var themeBtn = document.getElementById('theme-toggle');
    if(themeBtn){
      themeBtn.addEventListener('click', function(){
        var currentTheme = document.documentElement.getAttribute('data-theme');
        var isDark = currentTheme === 'dark' || (!currentTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
        var newTheme = isDark ? 'light' : 'dark';
        applyTheme(newTheme);
        localStorage.setItem('tvh_theme', newTheme);
      });
    }
  }

  function applyTheme(theme){
    if(theme === 'dark' || theme === 'light'){
      document.documentElement.setAttribute('data-theme', theme);
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    var themeLabel = document.getElementById('theme-label');
    if(themeLabel){
      var isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      themeLabel.textContent = isDark ? 'Dark' : 'Light';
    }
  }

  // -------------------------------------------------------------
  // Utility & Helper Functions
  // -------------------------------------------------------------
  function esc(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  function showToast(message){
    var toast = document.getElementById('toast');
    if(!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(function(){
      toast.classList.remove('show');
    }, 2400);
  }

  function initials(name){
    if(!name || name === 'Unassigned') return '?';
    var parts = name.trim().split(/\s+/);
    var s = parts[0][0] || '';
    if(parts.length > 1) s += parts[parts.length - 1][0];
    return s.toUpperCase();
  }

  function priorityColor(p){
    p = (p || '').toLowerCase();
    if(p === 'highest') return 'var(--critical)';
    if(p === 'high') return 'var(--warning)';
    if(p === 'medium') return 'var(--story)';
    if(p === 'low' || p === 'lowest') return 'var(--good)';
    return 'var(--neutral-chip)';
  }

  function priorityRank(p){
    var i = PRIORITY_ORDER.indexOf(p);
    return i === -1 ? PRIORITY_ORDER.length : i;
  }

  function statusColor(s){
    s = (s || '').toLowerCase();
    if(s.indexOf('progress') !== -1 || s.indexOf('dev') !== -1) return 'var(--accent)';
    if(s.indexOf('review') !== -1 || s.indexOf('qa') !== -1 || s.indexOf('test') !== -1) return 'var(--warning)';
    if(s.indexOf('block') !== -1 || s.indexOf('reject') !== -1) return 'var(--critical)';
    if(s.indexOf('done') !== -1 || s.indexOf('closed') !== -1 || s.indexOf('resolved') !== -1) return 'var(--good)';
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
      p.stories.forEach(function(t){ out.push({t: t, itype: 'Story', assignee: p.name}); });
      p.bugs.forEach(function(t){ out.push({t: t, itype: 'Bug', assignee: p.name}); });
    });
    return out;
  }

  // -------------------------------------------------------------
  // Data Computation & Stats
  // -------------------------------------------------------------
  function computeStats(data){
    var stories = 0, bugs = 0, named = 0, hasUnassigned = false, aging = 0;
    data.forEach(function(p){
      stories += p.stories.length;
      bugs += p.bugs.length;
      if(p.name === 'Unassigned'){
        hasUnassigned = true;
      } else {
        named++;
      }
      p.stories.concat(p.bugs).forEach(function(t){
        if((t.due || 0) >= AGE_CRITICAL) aging++;
      });
    });
    return {
      stories: stories,
      bugs: bugs,
      total: stories + bugs,
      assignees: named,
      hasUnassigned: hasUnassigned,
      aging: aging
    };
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

  function animateBars(container){
    var tracks = container.querySelectorAll('.bar-track[data-pct]');
    requestAnimationFrame(function(){
      requestAnimationFrame(function(){
        Array.prototype.forEach.call(tracks, function(el){
          el.style.width = el.getAttribute('data-pct') + '%';
        });
      });
    });
  }

  // -------------------------------------------------------------
  // Workload & Breakdown Charts
  // -------------------------------------------------------------
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
      var pct = Math.max((total / maxTotal) * 100, total > 0 ? 5 : 0);
      var segs = '';
      if(st > 0){
        segs += '<div class="bar-seg story ' + (bg === 0 ? 'only-seg' : 'first-seg') + '" style="flex:' + st + ' 0 0" title="' + st + ' Stories"><span class="seg-count">' + st + '</span></div>';
      }
      if(bg > 0){
        segs += '<div class="bar-seg bug ' + (st === 0 ? 'only-seg' : 'last-seg') + '" style="flex:' + bg + ' 0 0" title="' + bg + ' Bugs"><span class="seg-count">' + bg + '</span></div>';
      }
      var isUnassigned = p.name === 'Unassigned';
      var nameCls = isUnassigned ? 'workload-name unassigned' : 'workload-name';
      var avatarCls = isUnassigned ? 'workload-avatar unassigned' : 'workload-avatar';
      return '<div class="workload-row" data-assignee="' + esc(p.name) + '">' +
        '<div class="workload-id">' +
          '<span class="' + avatarCls + '">' + initials(p.name) + '</span>' +
          '<span class="' + nameCls + '">' + esc(p.name) + '</span>' +
        '</div>' +
        '<div class="bar-track" data-pct="' + pct.toFixed(1) + '">' + segs + '</div>' +
        '<div class="workload-total">' + total + '</div>' +
        '</div>';
    }).join('');
    card.innerHTML = rows;
    animateBars(card);

    // Clicking a workload row filters by that assignee
    Array.prototype.forEach.call(card.querySelectorAll('.workload-row'), function(row){
      row.addEventListener('click', function(){
        var name = row.getAttribute('data-assignee');
        var searchInput = document.getElementById('assignee-search');
        if(searchInput.value === name){
          searchInput.value = '';
        } else {
          searchInput.value = name;
        }
        updateClearSearchBtn();
        renderAll();
      });
    });
  }

  function renderMiniBars(containerId, rows, filterType){
    var container = document.getElementById(containerId);
    if(!rows.length){
      container.innerHTML = '<div class="empty-state">No matching items.</div>';
      return;
    }
    var max = Math.max.apply(null, rows.map(function(r){ return r.count; }));
    if(max <= 0) max = 1;
    container.innerHTML = rows.map(function(r){
      var pct = Math.max((r.count / max) * 100, r.count > 0 ? 5 : 0);
      return '<div class="workload-row" data-filter-type="' + filterType + '" data-filter-value="' + esc(r.label) + '" title="Click to filter by ' + esc(r.label) + '">' +
        '<div class="workload-name">' + esc(r.label) + '</div>' +
        '<div class="bar-track" data-pct="' + pct.toFixed(1) + '"><div class="bar-seg only-seg" style="flex:1 0 0; background-color:' + r.color + '"></div></div>' +
        '<div class="workload-total">' + r.count + '</div>' +
        '</div>';
    }).join('');
    animateBars(container);

    Array.prototype.forEach.call(container.querySelectorAll('.workload-row'), function(row){
      row.addEventListener('click', function(){
        var ft = row.getAttribute('data-filter-type');
        var fv = row.getAttribute('data-filter-value');
        if(ft === 'priority'){
          var pFilter = document.getElementById('priority-filter');
          pFilter.value = (pFilter.value === fv) ? '' : fv;
        } else if(ft === 'status'){
          var sFilter = document.getElementById('status-filter');
          sFilter.value = (sFilter.value === fv) ? '' : fv;
        }
        renderAll();
      });
    });
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
      .map(function(p){ return {label: p, count: byPriority[p], color: priorityColor(p)}; });
    Object.keys(byPriority).forEach(function(p){
      if(PRIORITY_ORDER.indexOf(p) === -1) priorityRows.push({label: p, count: byPriority[p], color: priorityColor(p)});
    });
    var statusRows = Object.keys(byStatus).map(function(s){
      return {label: s, count: byStatus[s], color: statusColor(s)};
    }).sort(function(a, b){ return b.count - a.count; });

    renderMiniBars('priority-breakdown', priorityRows, 'priority');
    renderMiniBars('status-breakdown', statusRows, 'status');
  }

  // -------------------------------------------------------------
  // Ticket Rows & Assignee Rendering
  // -------------------------------------------------------------
  function ticketRow(t, itype, assigneeName){
    var dotColor = itype === 'Story' ? 'var(--story)' : 'var(--bug)';
    var jiraUrl = JIRA_BASE_URL + encodeURIComponent(t.key);
    var copyPayload = t.key + ': ' + (t.summary || '');

    return '<tr>' +
      '<td>' +
        '<div class="key-wrapper">' +
          '<a href="' + jiraUrl + '" target="_blank" rel="noopener noreferrer" class="key-link" title="Open in Jira">' + esc(t.key) + ' &#8599;</a>' +
          '<button type="button" class="copy-btn" data-copy="' + esc(copyPayload) + '" title="Copy Key & Summary">&#128203;</button>' +
        '</div>' +
      '</td>' +
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
    'age-desc': function(a, b){ return (b.t.due || 0) - (a.t.due || 0); },
    'age-asc': function(a, b){ return (a.t.due || 0) - (b.t.due || 0); },
    'priority': function(a, b){ return priorityRank(a.t.priority) - priorityRank(b.t.priority); },
    'key': function(a, b){ return (a.t.key || '').localeCompare(b.t.key || '', undefined, {numeric: true}); }
  };

  function renderAssigneeList(data, searchQuery){
    var list = document.getElementById('assignee-list');
    var q = (searchQuery || '').trim().toLowerCase();
    var sortValue = document.getElementById('sort-select').value;
    var sorter = SORTERS[sortValue] || SORTERS['age-desc'];

    // Smart Multi-field Filtering: search in assignee, key, or summary
    var filteredData = data.map(function(p){
      var nameMatch = !q || p.name.toLowerCase().indexOf(q) !== -1;
      var matchingStories = p.stories.filter(function(t){
        return nameMatch || (t.key && t.key.toLowerCase().indexOf(q) !== -1) || (t.summary && t.summary.toLowerCase().indexOf(q) !== -1);
      });
      var matchingBugs = p.bugs.filter(function(t){
        return nameMatch || (t.key && t.key.toLowerCase().indexOf(q) !== -1) || (t.summary && t.summary.toLowerCase().indexOf(q) !== -1);
      });
      return {
        name: p.name,
        stories: matchingStories,
        bugs: matchingBugs,
        hasMatches: (matchingStories.length + matchingBugs.length) > 0
      };
    }).filter(function(p){ return p.hasMatches; });

    document.getElementById('result-count').textContent = q ? (filteredData.length + ' matching assignees') : (filteredData.length + ' assignees');

    if(!filteredData.length){
      list.innerHTML = '<div class="empty-state">No tickets or assignees match the current search and filters.</div>';
      return;
    }

    list.innerHTML = filteredData.map(function(p){
      var total = p.stories.length + p.bugs.length;
      var agingCount = p.stories.concat(p.bugs).filter(function(t){ return (t.due || 0) >= AGE_CRITICAL; }).length;
      var allTickets = p.stories.map(function(t){ return {t: t, itype: 'Story'}; })
        .concat(p.bugs.map(function(t){ return {t: t, itype: 'Bug'}; }))
        .sort(sorter);
      var rowsHtml = allTickets.map(function(x){ return ticketRow(x.t, x.itype, p.name); }).join('');
      var isOpen = !!openState[p.name] || (q.length > 0);

      return '<div class="assignee-card' + (isOpen ? ' open' : '') + '" data-name="' + esc(p.name) + '">' +
        '<button type="button" class="assignee-head" aria-expanded="' + isOpen + '">' +
          '<span class="assignee-id">' +
            '<span class="assignee-avatar">' + initials(p.name) + '</span>' +
            '<span class="assignee-name">' + esc(p.name) + '</span>' +
          '</span>' +
          '<span class="assignee-counts">' +
            '<span class="count-chip"><span class="dot" style="background:var(--story)"></span>' + p.stories.length + ' stories</span>' +
            '<span class="count-chip"><span class="dot" style="background:var(--bug)"></span>' + p.bugs.length + ' bugs</span>' +
            (agingCount > 0 ? '<span class="count-chip alert"><span class="dot" style="background:var(--critical)"></span>' + agingCount + ' aging (90+d)</span>' : '') +
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

    // Attach click events to card headers
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

    // Attach copy button handlers
    Array.prototype.forEach.call(list.querySelectorAll('.copy-btn'), function(btn){
      btn.addEventListener('click', function(e){
        e.stopPropagation();
        var payload = btn.getAttribute('data-copy');
        if(navigator.clipboard && navigator.clipboard.writeText){
          navigator.clipboard.writeText(payload).then(function(){
            showToast('Copied: ' + payload);
          }).catch(function(){
            showToast('Copied: ' + payload);
          });
        } else {
          showToast('Copied: ' + payload);
        }
      });
    });
  }

  // -------------------------------------------------------------
  // Filtering & Search
  // -------------------------------------------------------------
  function applyTicketFilters(data){
    var type = document.getElementById('type-filter').value;
    var priority = document.getElementById('priority-filter').value;
    var status = document.getElementById('status-filter').value;

    function matches(t){
      if(priority && t.priority !== priority) return false;
      if(status && t.status !== status) return false;
      if(activeAgingFilter === 90 && (t.due || 0) < AGE_CRITICAL) return false;
      if(activeAgingFilter === 30 && ((t.due || 0) < AGE_WARN || (t.due || 0) >= AGE_CRITICAL)) return false;
      return true;
    }

    return data.map(function(p){
      var stories = (type === 'Bug') ? [] : p.stories.filter(matches);
      var bugs = (type === 'Story') ? [] : p.bugs.filter(matches);
      return {name: p.name, stories: stories, bugs: bugs};
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

  function updateClearSearchBtn(){
    var val = document.getElementById('assignee-search').value;
    var clearBtn = document.getElementById('clear-search-btn');
    if(clearBtn){
      clearBtn.style.display = val ? 'inline-block' : 'none';
    }
  }

  // -------------------------------------------------------------
  // Quick Filters Pills
  // -------------------------------------------------------------
  function initQuickFilters(){
    var pillBtns = document.querySelectorAll('.pill-btn');
    Array.prototype.forEach.call(pillBtns, function(btn){
      btn.addEventListener('click', function(){
        Array.prototype.forEach.call(pillBtns, function(b){ b.classList.remove('active'); });
        btn.classList.add('active');

        var preset = btn.getAttribute('data-preset');
        var typeFilter = document.getElementById('type-filter');
        var prioFilter = document.getElementById('priority-filter');
        var statusFilter = document.getElementById('status-filter');

        // Reset individual controls first
        typeFilter.value = '';
        prioFilter.value = '';
        statusFilter.value = '';
        activeAgingFilter = null;

        if(preset === 'bugs'){
          typeFilter.value = 'Bug';
        } else if(preset === 'stories'){
          typeFilter.value = 'Story';
        } else if(preset === 'aging-90'){
          activeAgingFilter = 90;
        } else if(preset === 'aging-30'){
          activeAgingFilter = 30;
        } else if(preset === 'prio-highest'){
          prioFilter.value = 'Highest';
        } else if(preset === 'prio-high'){
          prioFilter.value = 'High';
        }

        renderAll();
      });
    });
  }

  // -------------------------------------------------------------
  // Stat Card Clicking
  // -------------------------------------------------------------
  function initStatCardClicks(){
    var storiesCard = document.getElementById('stat-card-stories');
    var bugsCard = document.getElementById('stat-card-bugs');
    var totalCard = document.getElementById('stat-card-total');
    var agingCard = document.getElementById('stat-card-aging');

    if(storiesCard){
      storiesCard.addEventListener('click', function(){
        var sel = document.getElementById('type-filter');
        sel.value = (sel.value === 'Story') ? '' : 'Story';
        renderAll();
      });
    }

    if(bugsCard){
      bugsCard.addEventListener('click', function(){
        var sel = document.getElementById('type-filter');
        sel.value = (sel.value === 'Bug') ? '' : 'Bug';
        renderAll();
      });
    }

    if(totalCard){
      totalCard.addEventListener('click', function(){
        document.getElementById('type-filter').value = '';
        document.getElementById('priority-filter').value = '';
        document.getElementById('status-filter').value = '';
        document.getElementById('assignee-search').value = '';
        activeAgingFilter = null;
        updateClearSearchBtn();
        renderAll();
      });
    }

    if(agingCard){
      agingCard.addEventListener('click', function(){
        activeAgingFilter = (activeAgingFilter === 90) ? null : 90;
        renderAll();
      });
    }
  }

  // -------------------------------------------------------------
  // Expand / Collapse All Cards
  // -------------------------------------------------------------
  var allExpanded = false;
  var toggleAllBtn = document.getElementById('toggle-all-cards-btn');
  if(toggleAllBtn){
    toggleAllBtn.addEventListener('click', function(){
      allExpanded = !allExpanded;
      toggleAllBtn.textContent = allExpanded ? 'Collapse All' : 'Expand All';
      var cards = document.querySelectorAll('.assignee-card');
      Array.prototype.forEach.call(cards, function(card){
        var name = card.getAttribute('data-name');
        card.classList.toggle('open', allExpanded);
        var head = card.querySelector('.assignee-head');
        if(head) head.setAttribute('aria-expanded', String(allExpanded));
        openState[name] = allExpanded;
      });
    });
  }

  // -------------------------------------------------------------
  // Export Handlers (CSV and Excel)
  // -------------------------------------------------------------
  function csvField(v){
    var s = String(v == null ? '' : v);
    if(/[",\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function getExportRows(){
    var filtered = applyTicketFilters(current);
    var q = document.getElementById('assignee-search').value.trim().toLowerCase();
    var flat = [];
    filtered.forEach(function(p){
      var nameMatch = !q || p.name.toLowerCase().indexOf(q) !== -1;
      p.stories.forEach(function(t){
        if(nameMatch || (t.key && t.key.toLowerCase().indexOf(q) !== -1) || (t.summary && t.summary.toLowerCase().indexOf(q) !== -1)){
          flat.push({key: t.key, type: 'Story', summary: t.summary, assignee: p.name, priority: t.priority, status: t.status, due: t.due || 0});
        }
      });
      p.bugs.forEach(function(t){
        if(nameMatch || (t.key && t.key.toLowerCase().indexOf(q) !== -1) || (t.summary && t.summary.toLowerCase().indexOf(q) !== -1)){
          flat.push({key: t.key, type: 'Bug', summary: t.summary, assignee: p.name, priority: t.priority, status: t.status, due: t.due || 0});
        }
      });
    });
    return flat;
  }

  var exportCsvBtn = document.getElementById('export-csv-btn');
  if(exportCsvBtn){
    exportCsvBtn.addEventListener('click', function(){
      var rows = getExportRows();
      var header = ['Key', 'Type', 'Summary', 'Assignee', 'Priority', 'Status', 'Days Open'];
      var lines = [header.map(csvField).join(',')];
      rows.forEach(function(x){
        lines.push([x.key, x.type, x.summary, x.assignee, x.priority, x.status, x.due].map(csvField).join(','));
      });
      var blob = new Blob([lines.join('\r\n')], {type: 'text/csv;charset=utf-8;'});
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'jira-report-' + new Date().toISOString().slice(0, 10) + '.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Exported ' + rows.length + ' tickets to CSV');
    });
  }

  var exportXlsxBtn = document.getElementById('export-xlsx-btn');
  if(exportXlsxBtn){
    exportXlsxBtn.addEventListener('click', function(){
      if(typeof XLSX === 'undefined'){
        alert('Excel export library (SheetJS) is not loaded.');
        return;
      }
      var rows = getExportRows();
      var wsData = [['Issue Key', 'Issue Type', 'Summary', 'Assignee', 'Priority', 'Status', 'Days Open']];
      rows.forEach(function(x){
        wsData.push([x.key, x.type, x.summary, x.assignee, x.priority, x.status, x.due]);
      });
      var wb = XLSX.utils.book_new();
      var ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, 'Jira Standup Report');
      XLSX.writeFile(wb, 'jira-report-' + new Date().toISOString().slice(0, 10) + '.xlsx');
      showToast('Exported ' + rows.length + ' tickets to Excel');
    });
  }

  // -------------------------------------------------------------
  // Data Parsing & Grouping
  // -------------------------------------------------------------
  function parseCSV(text){
    var rows = [];
    var row = [];
    var field = '';
    var inQuotes = false;
    for(var i = 0; i < text.length; i++){
      var c = text[i];
      if(inQuotes){
        if(c === '"'){
          if(text[i + 1] === '"'){ field += '"'; i++; } else { inQuotes = false; }
        } else {
          field += c;
        }
      } else {
        if(c === '"'){
          inQuotes = true;
        } else if(c === ','){
          row.push(field); field = '';
        } else if(c === '\r'){
          // skip
        } else if(c === '\n'){
          row.push(field); rows.push(row); row = []; field = '';
        } else {
          field += c;
        }
      }
    }
    if(field.length || row.length){ row.push(field); rows.push(row); }
    if(!rows.length) return [];
    var header = rows[0].map(function(h){ return h.replace(/^\uFEFF/, '').trim(); });
    return rows.slice(1).filter(function(r){ return r.length > 1 || (r[0] || '').trim() !== ''; }).map(function(r){
      var obj = {};
      header.forEach(function(h, idx){ obj[h] = r[idx] != null ? r[idx] : ''; });
      return obj;
    });
  }

  function groupRows(rows){
    var people = Object.create(null);
    rows.forEach(function(row){
      var itype = String(row['Issue Type'] || row['Type'] || '').trim();
      if(itype !== 'Story' && itype !== 'Bug') return;
      var assignee = String(row['Assignee'] || '').trim() || 'Unassigned';
      var dueRaw = String(row['Due Days'] != null ? row['Due Days'] : (row['Days Open'] != null ? row['Days Open'] : '')).trim();
      var due = /^-?\d+$/.test(dueRaw) ? parseInt(dueRaw, 10) : 0;
      var entry = {
        key: String(row['Issue key'] || row['Key'] || '').trim(),
        summary: String(row['Summary'] || '').trim(),
        priority: String(row['Priority'] || '').trim(),
        status: String(row['Status'] || '').trim(),
        due: due
      };
      if(!people[assignee]) people[assignee] = {name: assignee, stories: [], bugs: []};
      if(itype === 'Story') people[assignee].stories.push(entry); else people[assignee].bugs.push(entry);
    });
    var named = Object.keys(people).filter(function(k){ return k !== 'Unassigned'; })
      .map(function(k){ return people[k]; })
      .sort(function(a, b){ return (b.stories.length + b.bugs.length) - (a.stories.length + a.bugs.length); });
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
    activeAgingFilter = null;
    updateClearSearchBtn();
    populateStatusFilter(current);
    renderAll();
  }

  function handleFile(file){
    if(!file) return;
    var name = file.name.toLowerCase();
    var reader = new FileReader();
    reader.onload = function(ev){
      try {
        var rows;
        if(name.endsWith('.csv')){
          rows = parseCSV(String(ev.target.result));
        } else {
          var wb = XLSX.read(ev.target.result, {type: 'array'});
          var sheetName = wb.SheetNames.indexOf('Jira') !== -1 ? 'Jira' : wb.SheetNames[0];
          rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {defval: ''});
        }
        var grouped = groupRows(rows);
        if(!grouped.length){
          throw new Error('No Story or Bug rows found in file.');
        }
        loadData(grouped);
        document.getElementById('preview-filename').textContent = file.name;
        document.getElementById('preview-banner').classList.add('active');
        showToast('Loaded ' + file.name);
      } catch(err){
        alert('Could not read "' + file.name + '". Make sure it is a valid Jira export containing Issue Type, Issue key, Summary, Assignee, Priority, Status, and Due Days.\n\nError: ' + err.message);
      }
      var fileInput = document.getElementById('file-input');
      if(fileInput) fileInput.value = '';
    };
    if(name.endsWith('.csv')){
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  }

  // -------------------------------------------------------------
  // Drag & Drop Handling
  // -------------------------------------------------------------
  function initDragAndDrop(){
    var overlay = document.getElementById('drop-overlay');
    var dragTimer = null;

    window.addEventListener('dragover', function(e){
      e.preventDefault();
      if(overlay) overlay.classList.add('active');
      clearTimeout(dragTimer);
    });

    window.addEventListener('dragleave', function(e){
      dragTimer = setTimeout(function(){
        if(overlay) overlay.classList.remove('active');
      }, 100);
    });

    window.addEventListener('drop', function(e){
      e.preventDefault();
      if(overlay) overlay.classList.remove('active');
      var files = e.dataTransfer && e.dataTransfer.files;
      if(files && files.length > 0){
        handleFile(files[0]);
      }
    });
  }

  // -------------------------------------------------------------
  // Event Listeners Initialization
  // -------------------------------------------------------------
  ['type-filter', 'priority-filter', 'status-filter', 'sort-select'].forEach(function(id){
    var el = document.getElementById(id);
    if(el) el.addEventListener('change', renderAll);
  });

  var searchEl = document.getElementById('assignee-search');
  if(searchEl){
    searchEl.addEventListener('input', function(){
      updateClearSearchBtn();
      renderAll();
    });
  }

  var clearSearchBtn = document.getElementById('clear-search-btn');
  if(clearSearchBtn){
    clearSearchBtn.addEventListener('click', function(){
      document.getElementById('assignee-search').value = '';
      updateClearSearchBtn();
      renderAll();
    });
  }

  var uploadBtn = document.getElementById('upload-btn');
  if(uploadBtn){
    uploadBtn.addEventListener('click', function(){
      document.getElementById('file-input').click();
    });
  }

  var fileInput = document.getElementById('file-input');
  if(fileInput){
    fileInput.addEventListener('change', function(e){
      var file = e.target.files && e.target.files[0];
      handleFile(file);
    });
  }

  var printBtn = document.getElementById('print-btn');
  if(printBtn){
    printBtn.addEventListener('click', function(){
      window.print();
    });
  }

  var resetPreviewBtn = document.getElementById('reset-preview');
  if(resetPreviewBtn){
    resetPreviewBtn.addEventListener('click', function(){
      loadData(DEFAULT_DATA);
      document.getElementById('preview-banner').classList.remove('active');
      showToast('Reset to default snapshot');
    });
  }

  // -------------------------------------------------------------
  // Bootstrap Application
  // -------------------------------------------------------------
  initTheme();
  initQuickFilters();
  initStatCardClicks();
  initDragAndDrop();
  populateStatusFilter(current);
  renderAll();

})();
