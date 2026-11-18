import { demoProjects } from '../data/projects.js';

const STORAGE_KEY = 'nexus.projects.v2';
const LEGACY_KEYS = ['nexus_obras', 'nexus-obras', 'obrasNexus'];

function safeRead(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn(`NEXUS: não foi possível ler ${key}.`, error);
    return null;
  }
}

function normaliseProject(project, index = 0) {
  const numberOrNull = (value) => {
    if (value === '' || value === null || value === undefined) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  return {
    id: String(project.id || project.codigo || `obra-importada-${Date.now()}-${index}`),
    name: String(project.name || project.nome || project.titulo || 'Construção sem nome'),
    category: String(project.category || project.categoria || 'Infraestrutura'),
    status: String(project.status || project.situacao || project.etapa || 'Planejamento'),
    neighborhood: String(project.neighborhood || project.bairro || 'Não informado'),
    address: String(project.address || project.endereco || project.endereço || 'Recife - PE'),
    latitude: numberOrNull(project.latitude ?? project.lat),
    longitude: numberOrNull(project.longitude ?? project.lng ?? project.lon),
    responsible: String(project.responsible || project.responsavel || project.responsável || ''),
    progress: Math.min(100, Math.max(0, numberOrNull(project.progress ?? project.progresso) ?? 0)),
    budget: numberOrNull(project.budget ?? project.orcamento ?? project.orçamento),
    startDate: String(project.startDate || project.dataInicio || project.inicio || ''),
    dueDate: String(project.dueDate || project.dataFim || project.previsao || ''),
    description: String(project.description || project.descricao || project.descrição || '')
  };
}

function readInitialProjects() {
  const saved = safeRead(STORAGE_KEY);
  if (Array.isArray(saved)) return saved.map(normaliseProject);

  for (const key of LEGACY_KEYS) {
    const legacy = safeRead(key);
    if (Array.isArray(legacy) && legacy.length) return legacy.map(normaliseProject);
  }

  // Mantém uma tentativa de aproveitar arrays globais existentes sem depender deles.
  const globalCandidates = [window.NEXUS_OBRAS, window.obras, window.OBRAS];
  const globalArray = globalCandidates.find(Array.isArray);
  return globalArray?.length
    ? globalArray.map(normaliseProject)
    : demoProjects.map(normaliseProject);
}

let projects = readInitialProjects();
const listeners = new Set();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (error) {
    console.error('NEXUS: falha ao salvar os projetos no navegador.', error);
    window.dispatchEvent(new CustomEvent('nexus:storage-error'));
  }
}

function notify() {
  persist();
  for (const listener of listeners) listener(getProjects());
  window.dispatchEvent(new CustomEvent('nexus:projects-updated', { detail: getProjects() }));
}

export function getProjects() {
  return projects.map((project) => ({ ...project }));
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function saveProject(project) {
  const normalized = normaliseProject(project);
  if (!normalized.name.trim()) throw new Error('Informe o nome da construção.');
  if (!Number.isFinite(normalized.latitude) || normalized.latitude < -90 || normalized.latitude > 90) {
    throw new Error('Informe uma latitude válida entre -90 e 90.');
  }
  if (!Number.isFinite(normalized.longitude) || normalized.longitude < -180 || normalized.longitude > 180) {
    throw new Error('Informe uma longitude válida entre -180 e 180.');
  }

  const existingIndex = projects.findIndex((item) => item.id === normalized.id);
  if (existingIndex >= 0) projects[existingIndex] = normalized;
  else projects.unshift({ ...normalized, id: normalized.id || `obra-${crypto.randomUUID()}` });
  notify();
  return normalized;
}

export function deleteProject(id) {
  const before = projects.length;
  projects = projects.filter((project) => project.id !== id);
  if (projects.length !== before) notify();
}

export function exportProjects() {
  return getProjects();
}
