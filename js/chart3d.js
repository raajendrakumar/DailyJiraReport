(function(){
  "use strict";

  var viewport = document.getElementById('chart3d-viewport');
  var loadingEl = document.getElementById('chart3d-loading');
  var tooltipEl = document.getElementById('chart3d-tooltip');
  var rotateBtn = document.getElementById('chart3d-rotate-btn');
  var resetBtn = document.getElementById('chart3d-reset-btn');

  if(!viewport || typeof THREE === 'undefined' || !THREE.OrbitControls || !THREE.CSS2DRenderer){
    if(loadingEl) loadingEl.textContent = '3D view is unavailable in this browser.';
    return;
  }

  var MAX_BARS = 24;
  var BAR_SIZE = 1;
  var BAR_GAP = 0.7;
  var MAX_BAR_HEIGHT = 4.2;
  var MIN_SEG_HEIGHT = 0.12;

  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function cssVar(name){
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  var scene, camera, renderer, labelRenderer, controls;
  var barGroup = new THREE.Group();
  var raycaster, pointer;
  var hovered = null;
  var initialCamPos = new THREE.Vector3(7.5, 6.2, 9.5);
  var initialTarget = new THREE.Vector3(0, 1.4, 0);
  var needsRender = true;
  var ground, gridHelper, fog;

  function initScene(){
    scene = new THREE.Scene();

    var w = viewport.clientWidth || 800;
    var h = viewport.clientHeight || 460;

    camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 100);
    camera.position.copy(initialCamPos);

    renderer = new THREE.WebGLRenderer({antialias: true, alpha: true, preserveDrawingBuffer: true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h);
    if('outputEncoding' in renderer) renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.domElement.className = 'chart3d-canvas';
    viewport.appendChild(renderer.domElement);

    labelRenderer = new THREE.CSS2DRenderer();
    labelRenderer.setSize(w, h);
    labelRenderer.domElement.className = 'chart3d-labels';
    viewport.appendChild(labelRenderer.domElement);

    var ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);
    var dir = new THREE.DirectionalLight(0xffffff, 0.85);
    dir.position.set(6, 10, 4);
    scene.add(dir);
    var fill = new THREE.DirectionalLight(0xffffff, 0.25);
    fill.position.set(-6, 4, -6);
    scene.add(fill);

    ground = new THREE.Mesh(
      new THREE.CircleGeometry(14, 48),
      new THREE.MeshStandardMaterial({color: 0xffffff, roughness: 1, metalness: 0})
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    gridHelper = new THREE.GridHelper(24, 24, 0x888888, 0x888888);
    gridHelper.material.transparent = true;
    scene.add(gridHelper);

    scene.add(barGroup);

    raycaster = new THREE.Raycaster();
    pointer = new THREE.Vector2(-999, -999);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.copy(initialTarget);
    controls.enableDamping = !reducedMotion;
    controls.dampingFactor = 0.08;
    controls.minDistance = 5;
    controls.maxDistance = 22;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.autoRotate = !reducedMotion;
    controls.autoRotateSpeed = 1.3;
    controls.update();

    controls.addEventListener('start', function(){
      if(controls.autoRotate){
        controls.autoRotate = false;
        setRotateBtnState(false);
      }
    });
    controls.addEventListener('change', function(){ needsRender = true; });

    applyTheme();

    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerleave', hideTooltip);

    if(window.ResizeObserver){
      new ResizeObserver(onResize).observe(viewport);
    } else {
      window.addEventListener('resize', onResize);
    }

    if(window.matchMedia){
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
    }

    if(loadingEl) loadingEl.remove();
  }

  function applyTheme(){
    var bg = cssVar('--bg') || '#f5f2ea';
    var surface2 = cssVar('--surface-2') || '#ede8dc';
    var borderColor = cssVar('--border') || '#ddd5c2';

    fog = new THREE.Fog(new THREE.Color(bg).getHex(), 16, 26);
    scene.fog = fog;

    ground.material.color = new THREE.Color(surface2);
    gridHelper.material.color = new THREE.Color(borderColor);
    gridHelper.material.opacity = 0.6;

    needsRender = true;
  }

  function clearBars(){
    while(barGroup.children.length){
      var group = barGroup.children.pop();
      group.traverse(function(obj){
        if(obj.geometry) obj.geometry.dispose();
        if(obj.material) obj.material.dispose();
        if(obj.element && obj.element.parentNode) obj.element.parentNode.removeChild(obj.element);
      });
      barGroup.remove(group);
    }
    hovered = null;
  }

  function makeLabel(text, className){
    var div = document.createElement('div');
    div.className = className;
    div.textContent = text;
    return new THREE.CSS2DObject(div);
  }

  function buildBars(data){
    clearBars();
    if(!data || !data.length) return;

    var sorted = data.slice().sort(function(a, b){
      return (b.stories.length + b.bugs.length) - (a.stories.length + a.bugs.length);
    }).slice(0, MAX_BARS);

    var maxTotal = Math.max.apply(null, sorted.map(function(p){ return p.stories.length + p.bugs.length; }));
    if(maxTotal <= 0) maxTotal = 1;
    var unit = MAX_BAR_HEIGHT / maxTotal;

    var storyColor = new THREE.Color((cssVar('--story') || '#3568c9'));
    var bugColor = new THREE.Color((cssVar('--bug') || '#c1621f'));
    var storyMat = new THREE.MeshStandardMaterial({color: storyColor, roughness: 0.5, metalness: 0.08});
    var bugMat = new THREE.MeshStandardMaterial({color: bugColor, roughness: 0.5, metalness: 0.08});

    var n = sorted.length;
    var spacing = BAR_SIZE + BAR_GAP;
    var offsetX = ((n - 1) * spacing) / 2;

    sorted.forEach(function(p, i){
      var st = p.stories.length, bg = p.bugs.length, total = st + bg;
      var x = i * spacing - offsetX;
      var group = new THREE.Group();
      group.position.x = x;
      group.userData = {name: p.name, stories: st, bugs: bg, total: total, baseMats: []};

      var y = 0;
      if(st > 0){
        var stH = Math.max(st * unit, MIN_SEG_HEIGHT);
        var stMesh = new THREE.Mesh(new THREE.BoxGeometry(BAR_SIZE, stH, BAR_SIZE), storyMat.clone());
        stMesh.position.y = y + stH / 2;
        stMesh.userData = group.userData;
        group.add(stMesh);
        group.userData.baseMats.push(stMesh.material);
        y += stH;
      }
      if(bg > 0){
        var bgH = Math.max(bg * unit, MIN_SEG_HEIGHT);
        var bgMesh = new THREE.Mesh(new THREE.BoxGeometry(BAR_SIZE, bgH, BAR_SIZE), bugMat.clone());
        bgMesh.position.y = y + bgH / 2;
        bgMesh.userData = group.userData;
        group.add(bgMesh);
        group.userData.baseMats.push(bgMesh.material);
        y += bgH;
      }
      if(y <= 0){
        y = MIN_SEG_HEIGHT;
        var emptyMesh = new THREE.Mesh(new THREE.BoxGeometry(BAR_SIZE, y, BAR_SIZE), new THREE.MeshStandardMaterial({color: 0x9aa0ab, roughness: 0.6}));
        emptyMesh.position.y = y / 2;
        emptyMesh.userData = group.userData;
        group.add(emptyMesh);
        group.userData.baseMats.push(emptyMesh.material);
      }

      var nameLabel = makeLabel(p.name, 'chart3d-label' + (p.name === 'Unassigned' ? ' unassigned' : ''));
      nameLabel.position.set(0, -0.35, BAR_SIZE / 2 + 0.05);
      group.add(nameLabel);

      var totalLabel = makeLabel(String(total), 'chart3d-total-label');
      totalLabel.position.set(0, y + 0.32, 0);
      group.add(totalLabel);

      barGroup.add(group);
    });

    needsRender = true;
  }

  function setRotateBtnState(on){
    if(!rotateBtn) return;
    rotateBtn.textContent = 'Auto-rotate: ' + (on ? 'On' : 'Off');
    rotateBtn.setAttribute('aria-pressed', String(on));
  }

  function onPointerMove(e){
    var rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    var intersects = raycaster.intersectObjects(barGroup.children, true);

    if(intersects.length){
      var obj = intersects[0].object;
      var data = obj.userData;
      if(hovered !== data){
        clearHoverHighlight();
        hovered = data;
        (hovered.baseMats || []).forEach(function(m){ m.emissive = new THREE.Color(0x333333); m.emissiveIntensity = 0.5; });
        needsRender = true;
      }
      tooltipEl.hidden = false;
      tooltipEl.style.left = (e.clientX - rect.left + 14) + 'px';
      tooltipEl.style.top = (e.clientY - rect.top + 10) + 'px';
      tooltipEl.innerHTML = '<strong>' + escapeHtml(data.name) + '</strong>' +
        '<span>' + data.stories + ' stories &middot; ' + data.bugs + ' bugs</span>' +
        '<span class="chart3d-tooltip-total">' + data.total + ' total</span>';
      renderer.domElement.style.cursor = 'pointer';
    } else {
      hideTooltip();
    }
  }

  function clearHoverHighlight(){
    if(hovered && hovered.baseMats){
      hovered.baseMats.forEach(function(m){ m.emissiveIntensity = 0; });
    }
    hovered = null;
  }

  function hideTooltip(){
    clearHoverHighlight();
    tooltipEl.hidden = true;
    renderer.domElement.style.cursor = 'grab';
    needsRender = true;
  }

  function escapeHtml(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  function onResize(){
    var w = viewport.clientWidth || 800;
    var h = viewport.clientHeight || 460;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    labelRenderer.setSize(w, h);
    needsRender = true;
  }

  function renderScene(){
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  }

  function animate(){
    requestAnimationFrame(animate);
    controls.update();
    if(needsRender || controls.autoRotate || controls.enableDamping){
      renderScene();
      needsRender = false;
    }
  }

  if(rotateBtn){
    rotateBtn.addEventListener('click', function(){
      controls.autoRotate = !controls.autoRotate;
      setRotateBtnState(controls.autoRotate);
      needsRender = true;
    });
  }
  if(resetBtn){
    resetBtn.addEventListener('click', function(){
      camera.position.copy(initialCamPos);
      controls.target.copy(initialTarget);
      controls.autoRotate = !reducedMotion;
      setRotateBtnState(controls.autoRotate);
      controls.update();
      needsRender = true;
    });
  }

  try{
    initScene();
    document.addEventListener('workload:data', function(e){ buildBars(e.detail); });
    if(reducedMotion){
      controls.addEventListener('change', renderScene);
      renderScene();
    } else {
      animate();
    }
  } catch(err){
    if(loadingEl){ loadingEl.textContent = '3D view failed to load in this browser.'; loadingEl.hidden = false; }
  }
})();
