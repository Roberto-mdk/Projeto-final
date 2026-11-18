// script.js
// NEXUS Urban Intelligence 2.0
// Interface, gestão de obras, filtros, pesquisa, tema e indicadores.

import {
    iniciarMapa,
    atualizarObras,
    localizarObra,
    localizarRecife,
    alterarTema,
    alterarCamada
} from "./Map3d.js";

const CHAVE_OBRAS = "nexus_obras_v2";
const CHAVE_TEMA = "nexus_tema_v2";

const obrasIniciais = [
    {
        id: "obra-001",
        nome: "Projeto de Requalificação Urbana",
        categoria: "Urbanismo",
        etapa: "Execução",
        endereco: "Bairro do Recife, Recife - PE",
        latitude: -8.0631,
        longitude: -34.8711,
        responsavel: "Equipe NEXUS",
        descricao: "Projeto demonstrativo de requalificação urbana.",
        progresso: 65,
        orcamento: 850000,
        dataInicio: "2026-01-15",
        dataFim: "2026-12-30",
        imagem: ""
    },
    {
        id: "obra-002",
        nome: "Centro de Mobilidade Urbana",
        categoria: "Infraestrutura",
        etapa: "Planejamento",
        endereco: "Santo Antônio, Recife - PE",
        latitude: -8.0638,
        longitude: -34.8785,
        responsavel: "Departamento de Mobilidade",
        descricao: "Projeto de modernização da mobilidade urbana.",
        progresso: 20,
        orcamento: 1200000,
        dataInicio: "2026-05-01",
        dataFim: "2027-03-30",
        imagem: ""
    },
    {
        id: "obra-003",
        nome: "Modernização de Espaço Público",
        categoria: "Reforma",
        etapa: "Execução",
        endereco: "Boa Vista, Recife - PE",
        latitude: -8.0578,
        longitude: -34.8856,
        responsavel: "Equipe de Infraestrutura",
        descricao: "Reforma e revitalização de espaço público.",
        progresso: 48,
        orcamento: 450000,
        dataInicio: "2026-03-10",
        dataFim: "2026-11-30",
        imagem: ""
    },
    {
        id: "obra-004",
        nome: "Residencial Horizonte",
        categoria: "Residencial",
        etapa: "Projeto",
        endereco: "Graças, Recife - PE",
        latitude: -8.0458,
        longitude: -34.8994,
        responsavel: "Construtora Horizonte",
        descricao: "Projeto residencial demonstrativo.",
        progresso: 5,
        orcamento: 2300000,
        dataInicio: "2026-10-01",
        dataFim: "2027-12-20",
        imagem: ""
    },
    {
        id: "obra-005",
        nome: "Edifício Empresarial Nexus",
        categoria: "Comercial",
        etapa: "Finalizada",
        endereco: "Boa Viagem, Recife - PE",
        latitude: -8.1184,
        longitude: -34.8950,
        responsavel: "Equipe Comercial",
        descricao: "Construção demonstrativa concluída.",
        progresso: 100,
        orcamento: 1800000,
        dataInicio: "2025-01-01",
        dataFim: "2026-09-30",
        imagem: ""
    }
];

const elementos = {};

let obras = [];
let mapa = null;
let obraEditando = null;

function selecionar(id) {
    return document.getElementById(id);
}

function carregarElementos() {
    [
        "map",
        "pesquisaObras",
        "filtroCategoria",
        "filtroEtapa",
        "listaObras",
        "contadorObras",
        "contadorResultados",
        "contadorCategorias",
        "modalObra",
        "formObra",
        "btnNovaObra",
        "btnFecharModal",
        "btnCancelar",
        "btnSalvarObra",
        "btnLocalizarRecife",
        "btnTema",
        "btnExcluir",
        "tituloModal",
        "camadaObras",
        "camadaEdificios",
        "camadaVias",
        "camadaAreasVerdes",
        "camadaEtiquetas",
        "painelDetalhes",
        "btnFecharDetalhes",
        "detalhesConteudo",
        "btnLimparPesquisa"
    ].forEach(id => {
        elementos[id] = selecionar(id);
    });
}

function obterObrasSalvas() {
    try {
        const dados = localStorage.getItem(CHAVE_OBRAS);

        if (!dados) {
            localStorage.setItem(CHAVE_OBRAS, JSON.stringify(obrasIniciais));
            return [...obrasIniciais];
        }

        const resultado = JSON.parse(dados);

        return Array.isArray(resultado) ? resultado : [...obrasIniciais];
    } catch (erro) {
        console.warn("Não foi possível carregar as obras.", erro);
        return [...obrasIniciais];
    }
}

function salvarObras() {
    localStorage.setItem(CHAVE_OBRAS, JSON.stringify(obras));
}

function gerarId() {
    return "obra-" + Date.now() + "-" + Math.random().toString(16).slice(2, 6);
}

function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function escaparHTML(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, caractere => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[caractere]);
}

function percentual(obra) {
    return Math.min(100, Math.max(0, Number(obra.progresso || 0)));
}

function classeEtapa(etapa) {
    const valor = String(etapa || "").toLowerCase();

    if (valor.includes("conclu")) return "status-concluida";
    if (valor.includes("execu")) return "status-execucao";
    if (valor.includes("planej")) return "status-planejamento";

    return "status-projeto";
}

function obterObrasFiltradas() {
    const pesquisa = (elementos.pesquisaObras?.value || "")
        .trim()
        .toLowerCase();

    const categoria = elementos.filtroCategoria?.value || "todas";
    const etapa = elementos.filtroEtapa?.value || "todas";

    return obras.filter(obra => {
        const texto = [
            obra.nome,
            obra.categoria,
            obra.etapa,
            obra.endereco,
            obra.responsavel
        ].join(" ").toLowerCase();

        const correspondePesquisa = !pesquisa || texto.includes(pesquisa);
        const correspondeCategoria =
            categoria === "todas" ||
            String(obra.categoria).toLowerCase() === categoria.toLowerCase();

        const correspondeEtapa =
            etapa === "todas" ||
            String(obra.etapa).toLowerCase() === etapa.toLowerCase();

        return correspondePesquisa && correspondeCategoria && correspondeEtapa;
    });
}

function renderizarLista() {
    if (!elementos.listaObras) return;

    const filtradas = obterObrasFiltradas();

    elementos.listaObras.innerHTML = "";

    if (filtradas.length === 0) {
        elementos.listaObras.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⌕</div>
                <h3>Nenhuma obra encontrada</h3>
                <p>Tente alterar os filtros ou a pesquisa.</p>
            </div>
        `;
    } else {
        filtradas.forEach(obra => {
            elementos.listaObras.appendChild(criarCardObra(obra));
        });
    }

    atualizarIndicadores(filtradas);
    atualizarMapa(filtradas);
}

function criarCardObra(obra) {
    const card = document.createElement("article");

    card.className = "obra-card";
    card.dataset.id = obra.id;

    card.innerHTML = `
        <div class="obra-card-top">
            <span class="obra-category">
                ${escaparHTML(obra.categoria)}
            </span>

            <span class="obra-status ${classeEtapa(obra.etapa)}">
                ${escaparHTML(obra.etapa)}
            </span>
        </div>

        <h3>${escaparHTML(obra.nome)}</h3>

        <p class="obra-address">
            <span>⌖</span>
            ${escaparHTML(obra.endereco)}
        </p>

        <div class="obra-progress-heading">
            <span>Progresso</span>
            <strong>${percentual(obra)}%</strong>
        </div>

        <div class="obra-progress-track">
            <div class="obra-progress-fill"
                 style="width:${percentual(obra)}%">
            </div>
        </div>

        <div class="obra-card-footer">
            <button class="obra-btn-map" data-action="map">
                <span>⌖</span> Localizar
            </button>

            <button class="obra-btn-details" data-action="details">
                Detalhes
            </button>

            <button class="obra-btn-edit" data-action="edit" aria-label="Editar">
                ✎
            </button>
        </div>
    `;

    card.querySelector('[data-action="map"]').addEventListener("click", () => {
        localizarObra(obra.id);
    });

    card.querySelector('[data-action="details"]').addEventListener("click", () => {
        abrirDetalhes(obra);
    });

    card.querySelector('[data-action="edit"]').addEventListener("click", () => {
        abrirModal(obra);
    });

    return card;
}

function atualizarMapa(lista) {
    if (!mapa) return;

    atualizarObras(lista);
}

function atualizarIndicadores(lista) {
    const total = obras.length;
    const resultado = lista.length;

    const categorias = new Set(
        obras.map(obra => obra.categoria)
    ).size;

    if (elementos.contadorObras) {
        elementos.contadorObras.textContent = total;
    }

    if (elementos.contadorResultados) {
        elementos.contadorResultados.textContent = resultado;
    }

    if (elementos.contadorCategorias) {
        elementos.contadorCategorias.textContent = categorias;
    }

    const executando = obras.filter(obra =>
        String(obra.etapa).toLowerCase().includes("execu")
    ).length;

    const concluidas = obras.filter(obra =>
        String(obra.etapa).toLowerCase().includes("conclu")
    ).length;

    const planejamento = obras.filter(obra =>
        String(obra.etapa).toLowerCase().includes("planej")
    ).length;

    const projetos = obras.filter(obra =>
        String(obra.etapa).toLowerCase().includes("projeto")
    ).length;

    atualizarTexto("indicadorExecucao", executando);
    atualizarTexto("indicadorConcluidas", concluidas);
    atualizarTexto("indicadorPlanejamento", planejamento);
    atualizarTexto("indicadorProjetos", projetos);
}

function atualizarTexto(id, valor) {
    const elemento = selecionar(id);

    if (elemento) {
        elemento.textContent = valor;
    }
}

function abrirModal(obra = null) {
    if (!elementos.modalObra) return;

    obraEditando = obra;

    elementos.modalObra.classList.add("modal-open");
    elementos.modalObra.setAttribute("aria-hidden", "false");

    if (elementos.tituloModal) {
        elementos.tituloModal.textContent = obra
            ? "Editar construção"
            : "Cadastrar nova obra";
    }

    if (elementos.btnExcluir) {
        elementos.btnExcluir.hidden = !obra;
    }

    preencherFormulario(obra);

    document.body.classList.add("modal-active");
}

function fecharModal() {
    if (!elementos.modalObra) return;

    elementos.modalObra.classList.remove("modal-open");
    elementos.modalObra.setAttribute("aria-hidden", "true");

    document.body.classList.remove("modal-active");

    obraEditando = null;

    elementos.formObra?.reset();
}

function preencherFormulario(obra) {
    const campos = [
        "nome",
        "categoria",
        "etapa",
        "endereco",
        "latitude",
        "longitude",
        "responsavel",
        "descricao",
        "progresso",
        "orcamento",
        "dataInicio",
        "dataFim",
        "imagem"
    ];

    campos.forEach(campo => {
        const input = selecionar(campo);

        if (!input) return;

        input.value = obra ? obra[campo] ?? "" : "";
    });
}

function lerFormulario() {
    return {
        nome: selecionar("nome")?.value.trim() || "",
        categoria: selecionar("categoria")?.value || "",
        etapa: selecionar("etapa")?.value || "",
        endereco: selecionar("endereco")?.value.trim() || "",
        latitude: Number(selecionar("latitude")?.value),
        longitude: Number(selecionar("longitude")?.value),
        responsavel: selecionar("responsavel")?.value.trim() || "",
        descricao: selecionar("descricao")?.value.trim() || "",
        progresso: Number(selecionar("progresso")?.value || 0),
        orcamento: Number(selecionar("orcamento")?.value || 0),
        dataInicio: selecionar("dataInicio")?.value || "",
        dataFim: selecionar("dataFim")?.value || "",
        imagem: selecionar("imagem")?.value.trim() || ""
    };
}

function validarFormulario(dados) {
    if (!dados.nome) {
        alert("Informe o nome da obra.");
        return false;
    }

    if (!dados.endereco) {
        alert("Informe o endereço.");
        return false;
    }

    if (
        !Number.isFinite(dados.latitude) ||
        dados.latitude < -90 ||
        dados.latitude > 90
    ) {
        alert("Informe uma latitude válida.");
        return false;
    }

    if (
        !Number.isFinite(dados.longitude) ||
        dados.longitude < -180 ||
        dados.longitude > 180
    ) {
        alert("Informe uma longitude válida.");
        return false;
    }

    if (dados.progresso < 0 || dados.progresso > 100) {
        alert("O progresso deve estar entre 0 e 100.");
        return false;
    }

    return true;
}

function salvarFormulario(evento) {
    evento.preventDefault();

    const dados = lerFormulario();

    if (!validarFormulario(dados)) return;

    if (obraEditando) {
        obras = obras.map(obra =>
            obra.id === obraEditando.id
                ? { ...obra, ...dados }
                : obra
        );
    } else {
        obras.unshift({
            id: gerarId(),
            ...dados
        });
    }

    salvarObras();
    fecharModal();
    renderizarLista();

    alert("Obra salva com sucesso!");
}

function excluirObra() {
    if (!obraEditando) return;

    const confirmacao = confirm(
        `Deseja excluir "${obraEditando.nome}"?`
    );

    if (!confirmacao) return;

    obras = obras.filter(obra => obra.id !== obraEditando.id);

    salvarObras();
    fecharModal();
    fecharDetalhes();
    renderizarLista();
}

function abrirDetalhes(obra) {
    if (!elementos.painelDetalhes || !elementos.detalhesConteudo) return;

    elementos.detalhesConteudo.innerHTML = `
        <div class="details-header">
            <span class="obra-status ${classeEtapa(obra.etapa)}">
                ${escaparHTML(obra.etapa)}
            </span>

            <span class="obra-category">
                ${escaparHTML(obra.categoria)}
            </span>
        </div>

        <h2>${escaparHTML(obra.nome)}</h2>

        <p class="details-location">
            ⌖ ${escaparHTML(obra.endereco)}
        </p>

        <div class="details-progress">
            <div class="details-progress-title">
                <span>Progresso geral</span>
                <strong>${percentual(obra)}%</strong>
            </div>

            <div class="obra-progress-track">
                <div class="obra-progress-fill"
                     style="width:${percentual(obra)}%">
                </div>
            </div>
        </div>

        <div class="details-grid">
            <div class="details-item">
                <small>Responsável</small>
                <strong>${escaparHTML(obra.responsavel || "Não informado")}</strong>
            </div>

            <div class="details-item">
                <small>Orçamento</small>
                <strong>${formatarMoeda(obra.orcamento)}</strong>
            </div>

            <div class="details-item">
                <small>Início</small>
                <strong>${escaparHTML(obra.dataInicio || "Não informado")}</strong>
            </div>

            <div class="details-item">
                <small>Previsão</small>
                <strong>${escaparHTML(obra.dataFim || "Não informado")}</strong>
            </div>
        </div>

        <div class="details-description">
            <h3>Descrição</h3>
            <p>${escaparHTML(obra.descricao || "Nenhuma descrição cadastrada.")}</p>
        </div>

        ${obra.imagem ? `
            <div class="details-image">
                <img src="${escaparHTML(obra.imagem)}"
                     alt="Fotografia da obra"
                     onerror="this.style.display='none'">
            </div>
        ` : ""}

        <div class="details-actions">
            <button id="detalhesLocalizar" class="btn-primary">
                Localizar no mapa
            </button>

            <button id="detalhesEditar" class="btn-secondary">
                Editar obra
            </button>

            <a href="lugar.html?id=${encodeURIComponent(obra.id)}"
               class="btn-secondary details-link">
                Página completa
            </a>
        </div>
    `;

    elementos.painelDetalhes.classList.add("details-open");

    selecionar("detalhesLocalizar")?.addEventListener("click", () => {
        localizarObra(obra.id);
    });

    selecionar("detalhesEditar")?.addEventListener("click", () => {
        fecharDetalhes();
        abrirModal(obra);
    });
}

function fecharDetalhes() {
    elementos.painelDetalhes?.classList.remove("details-open");
}

function aplicarTema(tema) {
    document.documentElement.dataset.theme = tema;

    localStorage.setItem(CHAVE_TEMA, tema);

    if (elementos.btnTema) {
        elementos.btnTema.innerHTML = tema === "noite"
            ? "☀ <span>Modo claro</span>"
            : "☾ <span>Modo escuro</span>";
    }

    alterarTema(tema);
}

function alternarTema() {
    const temaAtual = document.documentElement.dataset.theme || "dia";

    aplicarTema(temaAtual === "dia" ? "noite" : "dia");
}

function conectarCamadas() {
    elementos.camadaObras?.addEventListener("change", evento => {
        alterarCamada("obras", evento.target.checked);
    });

    elementos.camadaEdificios?.addEventListener("change", evento => {
        alterarCamada("edificios", evento.target.checked);
    });

    elementos.camadaVias?.addEventListener("change", evento => {
        alterarCamada("vias", evento.target.checked);
    });

    elementos.camadaAreasVerdes?.addEventListener("change", evento => {
        alterarCamada("areasVerdes", evento.target.checked);
    });

    elementos.camadaEtiquetas?.addEventListener("change", evento => {
        alterarCamada("etiquetas", evento.target.checked);
    });
}

function conectarEventos() {
    elementos.pesquisaObras?.addEventListener("input", renderizarLista);

    elementos.filtroCategoria?.addEventListener("change", renderizarLista);

    elementos.filtroEtapa?.addEventListener("change", renderizarLista);

    elementos.btnNovaObra?.addEventListener("click", () => abrirModal());

    elementos.btnFecharModal?.addEventListener("click", fecharModal);

    elementos.btnCancelar?.addEventListener("click", fecharModal);

    elementos.btnSalvarObra?.addEventListener("click", () => {
        elementos.formObra?.requestSubmit();
    });

    elementos.formObra?.addEventListener("submit", salvarFormulario);

    elementos.btnExcluir?.addEventListener("click", excluirObra);

    elementos.btnLocalizarRecife?.addEventListener("click", localizarRecife);

    elementos.btnTema?.addEventListener("click", alternarTema);

    elementos.btnFecharDetalhes?.addEventListener("click", fecharDetalhes);

    elementos.btnLimparPesquisa?.addEventListener("click", () => {
        if (elementos.pesquisaObras) {
            elementos.pesquisaObras.value = "";
        }

        if (elementos.filtroCategoria) {
            elementos.filtroCategoria.value = "todas";
        }

        if (elementos.filtroEtapa) {
            elementos.filtroEtapa.value = "todas";
        }

        renderizarLista();
    });

    elementos.modalObra?.addEventListener("click", evento => {
        if (evento.target === elementos.modalObra) {
            fecharModal();
        }
    });

    document.addEventListener("keydown", evento => {
        if (evento.key === "Escape") {
            fecharModal();
            fecharDetalhes();
        }
    });

    conectarCamadas();
}

function iniciarNexus() {
    carregarElementos();

    obras = obterObrasSalvas();

    mapa = iniciarMapa("map");

    conectarEventos();

    renderizarLista();

    const temaSalvo = localStorage.getItem(CHAVE_TEMA) || "dia";

    document.documentElement.dataset.theme = temaSalvo;

    if (temaSalvo === "noite") {
        alterarTema("noite");
    }

    console.info("NEXUS Urban Intelligence 2.0 iniciado.");
}

document.addEventListener("DOMContentLoaded", iniciarNexus);