import './styles.css';
import {
  getProjects,
  saveProject,
  deleteProject,
  subscribe,
  exportProjects
} from './lib/store.js';
import {
  findMap,
  registerMap,
  refreshMapProjects,
  focusProject,
  goHome,
  toggle3D,
  resizeMap,
  setProjectLayerVisibility,
  setLayerGroupVisibility,
  setMeasurementActive,
  finishMeasurement,
  clearMeasurement,
  setProjectSelectCallback,
  setMeasurementCallback
} from './lib/map-bridge.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const statusClass = (status) => status === 'Em andamento' ? 'status-progress' : status === 'Concluída' ? 'status-complete' : 'status-planned';
const statusColorName = (status) => status === 'Em andamento' ? 'orange' : status === 'Concluída' ? 'green' : 'blue';
let activeView = 'dashboard';
let measuring = false;
let focusedProjectId = null;
let globalQuery = '';

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

function formatCurrency(value) {
  if (value === null || value === undefined || value === '' || !Number.isFinite(Number(value))) return 'Não informado';
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function formatDate(value) {
  if (!value) return 'Não definida';
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? 'Não definida' : date.toLocaleDateString('pt-BR');
}

function showToast(message, type = 'info') {
  const region = $('#toastRegion');
  if (!region) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  region.append(toast);
  requestAnimationFrame(() => toast.classList.add('is-visible'));
  window.setTimeout(() => {
    toast.classList.remove('is-visible');
    window.setTimeout(() => toast.remove(), 250);
  }, 3400);
}

function setMapStatus(message, connected = false) {
  const status = $('#mapStatus');
  if (status) status.textContent = message;
  $('#mapPanel')?.classList.toggle('map-connected', connected);
  $('#mapFallback')?.classList.toggle('is-hidden', connected);
}

function updateMetrics() {
  const projects = getProjects();
  const total = projects.length;
  const active = projects.filter((project) => project.status === 'Em andamento').length;
  const planned = projects.filter((project) => project.status === 'Planejamento').length;
  const completed = projects.filter((project) => project.status === 'Concluída').length;
  $('#totalProjects').textContent = total;
  $('#activeProjects').textContent = active;
  $('#plannedProjects').textContent = planned;
  $('#completedProjects').textContent = completed;
  // Mantém indicadores usados por versões anteriores do NEXUS sincronizados.
  $('#totalObras').textContent = total;
  $('#obrasAndamento').textContent = active;
  $('#obrasConcluidas').textContent = completed;
}

function renderRecentProjects() {
  const root = $('#recentProjects');
  const projects = getProjects().slice(0, 4);
  root.innerHTML = projects.length ? projects.map((project) => `
    <button class="recent-project" data-open-project="${escapeHtml(project.id)}">
      <span class="project-marker ${statusColorName(project.status)}"></span>
      <span class="recent-project-main"><strong>${escapeHtml(project.name)}</strong><small>${escapeHtml(project.neighborhood)} · ${escapeHtml(project.category)}</small></span>
      <span class="status-badge ${statusClass(project.status)}">${escapeHtml(project.status)}</span>
      <span class="recent-chevron">›</span>
    </button>
  `).join('') : '<div class="empty-inline">Nenhuma construção cadastrada ainda.</div>';
}

function renderDistribution() {
  const projects = getProjects();
  const total = projects.length || 1;
  const counts = [
    { label: 'Em andamento', count: projects.filter((p) => p.status === 'Em andamento').length, color: 'orange' },
    { label: 'Planejamento', count: projects.filter((p) => p.status === 'Planejamento').length, color: 'blue' },
    { label: 'Concluída', count: projects.filter((p) => p.status === 'Concluída').length, color: 'green' }
  ];
  $('#projectDistribution').innerHTML = counts.map((item) => `
    <div class="distribution-row"><div class="distribution-label"><span>${item.label}</span><strong>${item.count}</strong></div>
    <div class="distribution-track"><i class="distribution-fill ${item.color}" style="width:${(item.count / total) * 100}%"></i></div></div>
  `).join('');
}

function projectCard(project) {
  return `
    <article class="project-card">
      <div class="project-card-top"><span class="category-tag">${escapeHtml(project.category)}</span><button class="card-more" data-edit-project="${escapeHtml(project.id)}" title="Editar projeto">···</button></div>
      <button class="project-card-title" data-open-project="${escapeHtml(project.id)}">${escapeHtml(project.name)}</button>
      <p class="project-card-address">⌖ ${escapeHtml(project.neighborhood)} · ${escapeHtml(project.address)}</p>
      <div class="project-card-status"><span class="status-badge ${statusClass(project.status)}">${escapeHtml(project.status)}</span><strong>${project.progress}%</strong></div>
      <div class="progress-track"><i style="width:${project.progress}%"></i></div>
      <div class="project-card-meta"><span>Responsável</span><strong>${escapeHtml(project.responsible || 'Não informado')}</strong></div>
      <div class="project-card-footer"><button class="text-button" data-open-project="${escapeHtml(project.id)}">Ver detalhes →</button><button class="text-button" data-focus-project="${escapeHtml(project.id)}">Localizar no mapa</button></div>
    </article>
  `;
}

function getFilteredProjects() {
  const search = ($('#projectSearch')?.value || globalQuery).trim().toLocaleLowerCase('pt-BR');
  const status = $('#statusFilter')?.value || 'todos';
  const category = $('#categoryFilter')?.value || 'todas';
  return getProjects().filter((project) => {
    const haystack = [project.name, project.category, project.neighborhood, project.address, project.responsible].join(' ').toLocaleLowerCase('pt-BR');
    return (!search || haystack.includes(search))
      && (status === 'todos' || project.status === status)
      && (category === 'todas' || project.category === category);
  });
}

function renderProjects() {
  const projects = getFilteredProjects();
  $('#projectsList').innerHTML = projects.map(projectCard).join('');
  $('#projectsEmpty').hidden = projects.length > 0;
}

function renderTimeline() {
  const projects = [...getProjects()].sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'));
  $('#timelineList').innerHTML = projects.length ? projects.map((project) => `
    <article class="timeline-item">
      <div class="timeline-rail"><i class="timeline-dot ${statusColorName(project.status)}"></i><span></span></div>
      <div class="timeline-content"><div class="timeline-top"><span class="category-tag">${escapeHtml(project.category)}</span><span class="status-badge ${statusClass(project.status)}">${escapeHtml(project.status)}</span></div>
        <h3>${escapeHtml(project.name)}</h3><p>${escapeHtml(project.neighborhood)} · ${escapeHtml(project.responsible || 'Responsável não informado')}</p>
        <div class="timeline-progress"><div class="progress-track"><i style="width:${project.progress}%"></i></div><strong>${project.progress}%</strong></div>
        <div class="timeline-dates"><span>Início: ${formatDate(project.startDate)}</span><span>Previsão: ${formatDate(project.dueDate)}</span></div>
      </div>
    </article>
  `).join('') : '<div class="empty-inline">Nenhum cronograma cadastrado.</div>';
}

function renderReports() {
  const projects = getProjects();
  const sumBudget = projects.reduce((sum, project) => sum + (Number(project.budget) || 0), 0);
  const averageProgress = projects.length ? Math.round(projects.reduce((sum, project) => sum + project.progress, 0) / projects.length) : 0;
  const categories = [...new Set(projects.map((project) => project.category))];
  const reports = [
    { label: 'Projetos cadastrados', value: projects.length, note: 'Registros locais' },
    { label: 'Progresso médio', value: `${averageProgress}%`, note: 'Média simples dos registros' },
    { label: 'Orçamento informado', value: formatCurrency(sumBudget), note: 'Soma dos valores preenchidos' },
    { label: 'Categorias', value: categories.length, note: 'Tipos de empreendimento' }
  ];
  $('#reportGrid').innerHTML = reports.map((report) => `<article class="report-card"><span>${report.label}</span><strong>${report.value}</strong><small>${report.note}</small></article>`).join('');
}

function renderProfessionals() {
  const map = new Map();
  for (const project of getProjects()) {
    const name = project.responsible?.trim() || 'Responsável não informado';
    map.set(name, [...(map.get(name) || []), project]);
  }
  $('#professionalsList').innerHTML = [...map.entries()].map(([name, projects]) => `
    <article class="professional-card"><div class="professional-avatar">${escapeHtml(name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase())}</div><div><h3>${escapeHtml(name)}</h3><p>${projects.length} projeto(s) associado(s)</p><small>${escapeHtml([...new Set(projects.map((p) => p.category))].join(' · '))}</small></div></article>
  `).join('') || '<div class="empty-inline">Nenhum responsável cadastrado.</div>';
}

function renderAll() {
  updateMetrics();
  renderRecentProjects();
  renderDistribution();
  renderProjects();
  renderTimeline();
  renderReports();
  renderProfessionals();
  refreshMapProjects(getProjects());
  const current = getProjects().find((project) => project.id === focusedProjectId);
  if (current && !$('#detailDrawer').hidden) showProjectDetails(current.id);
}

const viewInfo = {
  dashboard: ['Visão geral', 'Acompanhe os projetos e a dinâmica das construções em Recife.'],
  map: ['Mapa inteligente', 'Explore a cidade, suas construções e as camadas geográficas disponíveis.'],
  projects: ['Obras e projetos', 'Gerencie o cadastro e o acompanhamento dos empreendimentos.'],
  timeline: ['Cronogramas', 'Consulte prazos, etapas e progresso informado dos projetos.'],
  reports: ['Relatórios', 'Analise os indicadores calculados a partir dos registros locais.'],
  professionals: ['Profissionais', 'Consulte responsáveis associados aos projetos cadastrados.']
};

function switchView(view) {
  if (!viewInfo[view]) return;
  activeView = view;
  $$('.nav-item[data-view]').forEach((button) => button.classList.toggle('is-active', button.dataset.view === view));
  $('#breadcrumbCurrent').textContent = viewInfo[view][0];
  $('#pageTitle').textContent = viewInfo[view][0];
  $('#pageSubtitle').textContent = viewInfo[view][1];
  const mapView = view === 'dashboard' || view === 'map';
  $('#statsGrid').hidden = view !== 'dashboard';
  $('#mapPanel').hidden = !mapView;
  $('#dashboardBottom').hidden = view !== 'dashboard';
  $('#projectsView').hidden = view !== 'projects';
  $('#timelineView').hidden = view !== 'timeline';
  $('#reportsView').hidden = view !== 'reports';
  $('#professionalsView').hidden = view !== 'professionals';
  $('#mapPanel').classList.toggle('map-panel-focused', view === 'map');
  $('#pageHeading').hidden = view === 'map';
  if (view === 'map') {
    window.setTimeout(resizeMap, 120);
    window.setTimeout(resizeMap, 450);
  }
}

function showProjectDetails(id) {
  const project = getProjects().find((item) => item.id === id);
  if (!project) return;
  focusedProjectId = id;
  $('#detailContent').innerHTML = `
    <div class="detail-cover ${statusColorName(project.status)}"><span>${escapeHtml(project.category)}</span><strong>${project.progress}%</strong><small>PROGRESSO INFORMADO</small></div>
    <div class="detail-body"><span class="status-badge ${statusClass(project.status)}">${escapeHtml(project.status)}</span><h2 id="detailTitle">${escapeHtml(project.name)}</h2>
      <p class="detail-location">⌖ ${escapeHtml(project.address)} · ${escapeHtml(project.neighborhood)}</p>
      <div class="detail-progress"><div class="progress-track"><i style="width:${project.progress}%"></i></div></div>
      <div class="detail-facts"><div><span>Responsável</span><strong>${escapeHtml(project.responsible || 'Não informado')}</strong></div><div><span>Categoria</span><strong>${escapeHtml(project.category)}</strong></div><div><span>Orçamento previsto</span><strong>${formatCurrency(project.budget)}</strong></div><div><span>Início</span><strong>${formatDate(project.startDate)}</strong></div><div><span>Previsão de conclusão</span><strong>${formatDate(project.dueDate)}</strong></div><div><span>Coordenadas</span><strong>${project.latitude ?? '—'}, ${project.longitude ?? '—'}</strong></div></div>
      <div class="detail-description"><span>DESCRIÇÃO</span><p>${escapeHtml(project.description || 'Nenhuma descrição cadastrada.')}</p></div>
      <div class="detail-actions"><button class="button button-primary" data-edit-project="${escapeHtml(project.id)}">Editar projeto</button><button class="button button-quiet" data-focus-project="${escapeHtml(project.id)}">Localizar no mapa</button><button class="danger-text" data-delete-project="${escapeHtml(project.id)}">Excluir registro</button></div>
    </div>`;
  $('#detailDrawer').hidden = false;
  $('#detailDrawer').classList.add('is-open');
  if (activeView !== 'map') switchView('map');
}

function openProjectModal(project = null) {
  $('#projectForm').reset();
  $('#projectId').value = project?.id || '';
  $('#modalTitle').textContent = project ? 'Editar construção' : 'Nova construção';
  $('#projectName').value = project?.name || '';
  $('#projectCategory').value = project?.category || 'Residencial';
  $('#projectStatus').value = project?.status || 'Planejamento';
  $('#projectNeighborhood').value = project?.neighborhood || '';
  $('#projectResponsible').value = project?.responsible || '';
  $('#projectAddress').value = project?.address || '';
  $('#projectLatitude').value = project?.latitude ?? '';
  $('#projectLongitude').value = project?.longitude ?? '';
  $('#projectProgress').value = project?.progress ?? 0;
  $('#projectBudget').value = project?.budget ?? '';
  $('#projectStart').value = project?.startDate || '';
  $('#projectDue').value = project?.dueDate || '';
  $('#projectDescription').value = project?.description || '';
  $('#projectModal').hidden = false;
  document.body.classList.add('modal-open');
  window.setTimeout(() => $('#projectName').focus(), 60);
}

function closeProjectModal() {
  $('#projectModal').hidden = true;
  document.body.classList.remove('modal-open');
}

function getFormProject() {
  const id = $('#projectId').value;
  return {
    id: id || `obra-${crypto.randomUUID()}`,
    name: $('#projectName').value.trim(),
    category: $('#projectCategory').value,
    status: $('#projectStatus').value,
    neighborhood: $('#projectNeighborhood').value.trim(),
    responsible: $('#projectResponsible').value.trim(),
    address: $('#projectAddress').value.trim(),
    latitude: Number($('#projectLatitude').value),
    longitude: Number($('#projectLongitude').value),
    progress: Math.min(100, Math.max(0, Number($('#projectProgress').value) || 0)),
    budget: $('#projectBudget').value === '' ? null : Number($('#projectBudget').value),
    startDate: $('#projectStart').value,
    dueDate: $('#projectDue').value,
    description: $('#projectDescription').value.trim()
  };
}

function exportCsv() {
  const projects = exportProjects();
  const columns = ['id', 'name', 'category', 'status', 'neighborhood', 'address', 'latitude', 'longitude', 'responsible', 'progress', 'budget', 'startDate', 'dueDate', 'description'];
  const csvCell = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const csv = [columns.join(';'), ...projects.map((project) => columns.map((key) => csvCell(project[key])).join(';'))].join('\r\n');
  downloadFile(`nexus-obras-${new Date().toISOString().slice(0, 10)}.csv`, `\uFEFF${csv}`, 'text/csv;charset=utf-8');
  showToast('Arquivo CSV gerado com os registros locais.', 'success');
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function startMeasurement() {
  const mapFound = findMap();
  if (!mapFound) {
    showToast('O mapa ainda não foi conectado. Confira os arquivos antigos e a integração indicada no README.', 'warning');
    return;
  }
  measuring = !measuring;
  setMeasurementActive(measuring, (result) => {
    $('#measureResult').hidden = result.count === 0;
    $('#measureValue').textContent = result.area || result.distance;
    $('#measureDetail').textContent = `${result.count} ponto(s) · distância ${result.distance}${result.area ? ` · área ${result.area}` : ''}`;
  });
  $('#measureHint').hidden = !measuring;
  $('#measureButton').classList.toggle('is-selected', measuring);
  $('#sidebarMeasure').classList.toggle('is-active', measuring);
  if (!measuring) finishMeasurement();
  else showToast('Clique no mapa para adicionar pontos de medição.', 'info');
}

function toggleMapTheme() {
  const night = !document.body.classList.contains('nexus-map-night');
  document.body.classList.toggle('nexus-map-night', night);
  localStorage.setItem('nexus.mapTheme', night ? 'night' : 'day');
  const label = night ? 'Modo diurno' : 'Modo noturno';
  $('#themeToggle').textContent = night ? '☀' : '☾';
  $('#nightModeButton').querySelector('strong').textContent = label;
  $('#nightModeButton').querySelector('.tool-icon').textContent = night ? '☀' : '☾';
  showToast(`${label} ativado.`, 'success');
}

function applySavedMapTheme() {
  const saved = localStorage.getItem('nexus.mapTheme') || 'day';
  const night = saved === 'night';
  document.body.classList.toggle('nexus-map-night', night);
  $('#themeToggle').textContent = night ? '☀' : '☾';
  $('#nightModeButton').querySelector('strong').textContent = night ? 'Modo diurno' : 'Modo noturno';
  $('#nightModeButton').querySelector('.tool-icon').textContent = night ? '☀' : '☾';
}

function bindLayerControls() {
  $$('[data-layer]').forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
      const group = checkbox.dataset.layer;
      if (group === 'projects') {
        const found = setProjectLayerVisibility(checkbox.checked);
        if (!found) showToast('Conecte o mapa para controlar esta camada.', 'warning');
        return;
      }
      const result = setLayerGroupVisibility(group, checkbox.checked);
      if (!result.found) showToast('Esta camada não foi encontrada no estilo atual do mapa. O controle ficará pronto para uma fonte de dados compatível.', 'warning');
      else showToast(`Camada atualizada: ${checkbox.checked ? 'visível' : 'oculta'}.`, 'success');
    });
  });
  $('#resetLayersButton').addEventListener('click', () => {
    $$('[data-layer]').forEach((checkbox) => {
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change'));
    });
  });
}

function bindEvents() {
  $$('[data-view]').forEach((button) => button.addEventListener('click', () => switchView(button.dataset.view)));
  $$('[data-open-view="projects"]').forEach((button) => button.addEventListener('click', () => switchView('projects')));
  $('#newProjectButton').addEventListener('click', () => openProjectModal());
  $('#projectForm').addEventListener('submit', (event) => {
    event.preventDefault();
    try {
      saveProject(getFormProject());
      closeProjectModal();
      showToast('Construção salva com sucesso neste navegador.', 'success');
    } catch (error) {
      showToast(error.message || 'Não foi possível salvar o projeto.', 'error');
    }
  });
  $$('[data-close-modal]').forEach((button) => button.addEventListener('click', closeProjectModal));
  $('#projectModal').addEventListener('click', (event) => { if (event.target === $('#projectModal')) closeProjectModal(); });
  $('#closeDrawer').addEventListener('click', () => { $('#detailDrawer').hidden = true; $('#detailDrawer').classList.remove('is-open'); focusedProjectId = null; });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeProjectModal();
      $('#detailDrawer').hidden = true;
      $('#detailDrawer').classList.remove('is-open');
      if (measuring) { measuring = false; finishMeasurement(); $('#measureHint').hidden = true; }
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      $('#globalSearch').focus();
    }
  });

  document.addEventListener('click', (event) => {
    const open = event.target.closest('[data-open-project]');
    const edit = event.target.closest('[data-edit-project]');
    const focus = event.target.closest('[data-focus-project]');
    const remove = event.target.closest('[data-delete-project]');
    if (open) showProjectDetails(open.dataset.openProject);
    if (edit) {
      const project = getProjects().find((item) => item.id === edit.dataset.editProject);
      if (project) openProjectModal(project);
    }
    if (focus) {
      const project = getProjects().find((item) => item.id === focus.dataset.focusProject);
      if (project) {
        switchView('map');
        const found = focusProject(project);
        if (!found) showToast('O mapa não foi conectado ao painel ainda.', 'warning');
      }
    }
    if (remove) {
      const project = getProjects().find((item) => item.id === remove.dataset.deleteProject);
      if (project && window.confirm(`Excluir o registro “${project.name}”?`)) {
        deleteProject(project.id);
        $('#detailDrawer').hidden = true;
        showToast('Registro excluído.', 'success');
      }
    }
  });

  $('#globalSearch').addEventListener('input', (event) => {
    globalQuery = event.target.value;
    $('#projectSearch').value = globalQuery;
    if (globalQuery) switchView('projects');
    renderProjects();
  });
  $('#projectSearch').addEventListener('input', renderProjects);
  $('#statusFilter').addEventListener('change', renderProjects);
  $('#categoryFilter').addEventListener('change', renderProjects);
  $('#measureButton').addEventListener('click', startMeasurement);
  $('#sidebarMeasure').addEventListener('click', startMeasurement);
  $('#finishMeasureButton').addEventListener('click', () => { measuring = false; finishMeasurement(); $('#measureHint').hidden = true; showToast('Medição finalizada.', 'success'); });
  $('#clearMeasureButton').addEventListener('click', () => { clearMeasurement(); showToast('Medição limpa.', 'info'); });
  $('#themeToggle').addEventListener('click', toggleMapTheme);
  $('#nightModeButton').addEventListener('click', toggleMapTheme);
  $('#homeBtn').addEventListener('click', () => { if (!goHome()) showToast('Mapa ainda não conectado.', 'warning'); });
  $('#toggle3dBtn').addEventListener('click', () => { if (!toggle3D()) showToast('Mapa ainda não conectado.', 'warning'); });
  $('#locateBtn').addEventListener('click', () => {
    if (!navigator.geolocation) { showToast('Geolocalização não disponível neste navegador.', 'warning'); return; }
    navigator.geolocation.getCurrentPosition((position) => {
      const map = findMap();
      if (map) map.flyTo({ center: [position.coords.longitude, position.coords.latitude], zoom: 16, pitch: 55 });
      else showToast('Mapa ainda não conectado.', 'warning');
    }, () => showToast('Não foi possível obter sua localização. Verifique a permissão do navegador.', 'warning'), { enableHighAccuracy: true, timeout: 8000 });
  });
  const fullscreen = () => {
    const target = $('#mapStage');
    if (!document.fullscreenElement) target.requestFullscreen?.();
    else document.exitFullscreen?.();
    window.setTimeout(resizeMap, 200);
  };
  $('#mapExpandButton').addEventListener('click', fullscreen);
  $('#mapFullscreenButton').addEventListener('click', fullscreen);
  $('#fullscreenBtn').addEventListener('click', fullscreen);
  $('#sidebarExport').addEventListener('click', exportCsv);
  $('#exportReportsButton').addEventListener('click', exportCsv);
  $('#notificationButton').addEventListener('click', () => showToast('Não há notificações conectadas nesta versão demonstrativa.', 'info'));
  $('#currentDate').textContent = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  bindLayerControls();
}

function connectExistingMap() {
  const candidates = [window.NEXUS_MAP, window.map, window.mapa, window.map3D, window.map3d];
  const map = candidates.find((item) => item && typeof item.addSource === 'function');
  if (map) {
    registerMap(map);
    setMapStatus('Mapa 3D conectado · camadas NEXUS disponíveis', true);
    refreshMapProjects(getProjects());
    return true;
  }
  return false;
}

function initialise() {
  bindEvents();
  applySavedMapTheme();
  renderAll();
  setProjectSelectCallback((id) => showProjectDetails(id));
  setMeasurementCallback((result) => {
    $('#measureResult').hidden = result.count === 0;
    $('#measureValue').textContent = result.area || result.distance;
    $('#measureDetail').textContent = `${result.count} ponto(s) · distância ${result.distance}${result.area ? ` · área ${result.area}` : ''}`;
  });
  subscribe(() => renderAll());

  if (connectExistingMap()) return;
  // Detecta o mapa inicializado pelos scripts antigos, sem reconstruí-lo.
  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    if (connectExistingMap()) {
      window.clearInterval(timer);
      return;
    }
    if (attempts >= 20) {
      window.clearInterval(timer);
      setMapStatus('Mapa não conectado · confira a cópia dos arquivos antigos e a linha de integração.', false);
    }
  }, 500);
}

initialise();