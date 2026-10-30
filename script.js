

"use strict";

// ========================================
// 1. DADOS DOS LUGARES
// Os textos e coordenadas são demonstrativos.
// Confira os dados antes de publicar.
// ========================================

const lugares = [
    {
        id: 1,
        nome: "Marco Zero",
        categoria: "rua",
        categoriaNome: "Praças e referências urbanas",
        descricao:
            "Referência urbana localizada na Praça Rio Branco, no Bairro do Recife.",
        periodo: "Contexto histórico a pesquisar",
        endereco: "Praça Rio Branco, Bairro do Recife, Recife - PE",
        latitude: -8.0631,
        longitude: -34.8711,
        fonte: "Consultar fontes oficiais e patrimoniais."
    },
    {
        id: 2,
        nome: "Rua do Bom Jesus",
        categoria: "rua",
        categoriaNome: "Ruas e praças",
        descricao:
            "Rua histórica do Bairro do Recife, importante para conhecer a formação urbana da região.",
        periodo: "História urbana do Recife",
        endereco: "Bairro do Recife, Recife - PE",
        latitude: -8.0618,
        longitude: -34.8715,
        fonte: "Consultar fontes oficiais e patrimoniais."
    },
    {
        id: 3,
        nome: "Paço do Frevo",
        categoria: "cultura",
        categoriaNome: "Cultura",
        descricao:
            "Equipamento cultural dedicado à salvaguarda, pesquisa e difusão do frevo.",
        periodo: "Cultura popular pernambucana",
        endereco: "Praça do Arsenal da Marinha, Bairro do Recife, Recife - PE",
        latitude: -8.0617,
        longitude: -34.8710,
        fonte: "Consultar o site oficial do Paço do Frevo."
    },
    {
        id: 4,
        nome: "Forte do Brum",
        categoria: "patrimonio",
        categoriaNome: "Patrimônio histórico",
        descricao:
            "Fortificação histórica ligada à história militar e à defesa da região do Recife.",
        periodo: "Período colonial e história militar",
        endereco: "Bairro do Recife, Recife - PE",
        latitude: -8.0525,
        longitude: -34.8714,
        fonte: "Consultar fontes oficiais do museu e do patrimônio."
    },
    {
        id: 5,
        nome: "Mercado de São José",
        categoria: "comercio",
        categoriaNome: "Comércio tradicional",
        descricao:
            "Mercado tradicional ligado ao comércio e à vida cotidiana do Recife.",
        periodo: "História do comércio recifense",
        endereco: "Bairro de São José, Recife - PE",
        latitude: -8.0687,
        longitude: -34.8780,
        fonte: "Consultar fontes oficiais municipais e patrimoniais."
    }
];

// ========================================
// 2. CONFIGURAÇÃO DO MAPA
// ========================================

const centroRecife = [-8.0618, -34.8720];
const zoomInicial = 14;

const mapa = L.map("mapa").setView(
    centroRecife,
    zoomInicial
);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">' +
        'OpenStreetMap</a> contributors'
}).addTo(mapa);

// Grupo que reúne os marcadores visíveis.
const camadaMarcadores = L.layerGroup().addTo(mapa);

// ========================================
// 3. ELEMENTOS DA PÁGINA
// ========================================

const lista = document.getElementById("lista-lugares");
const pesquisa = document.getElementById("pesquisa");
const contador = document.getElementById("contador");
const categoria = document.getElementById("categoria");
const botaoVoltar = document.getElementById("voltar-mapa");

// ========================================
// 4. FUNÇÕES AUXILIARES
// ========================================

function normalizar(texto) {
    return String(texto)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function criarElemento(tag, texto, classe = "") {
    const elemento = document.createElement(tag);
    elemento.textContent = texto;

    if (classe) {
        elemento.className = classe;
    }

    return elemento;
}

// ========================================
// 5. DETALHES DE UM LUGAR
// ========================================

function criarPopup(lugar) {
    const conteudo = document.createElement("div");

    conteudo.appendChild(
        criarElemento("strong", lugar.nome)
    );

    conteudo.appendChild(
        criarElemento("p", lugar.categoriaNome)
    );

    conteudo.appendChild(
        criarElemento("p", lugar.descricao)
    );

    conteudo.appendChild(
        criarElemento("p", "Período: " + lugar.periodo)
    );

    conteudo.appendChild(
        criarElemento("p", "Endereço: " + lugar.endereco)
    );

    conteudo.appendChild(
        criarElemento("p", "Fonte: " + lugar.fonte, "popup-fonte")
    );

    return conteudo;
}

function abrirLugar(lugar) {
    mapa.setView(
        [lugar.latitude, lugar.longitude],
        17,
        { animate: true }
    );

    L.popup()
        .setLatLng([lugar.latitude, lugar.longitude])
        .setContent(criarPopup(lugar))
        .openOn(mapa);
}

// ========================================
// 6. FILTRAR E EXIBIR OS LUGARES
// ========================================

function renderizarLugares() {
    const termo = normalizar(pesquisa.value);
    const categoriaSelecionada = categoria.value;

    const encontrados = lugares.filter(lugar => {
        const textoCompleto = normalizar(
            lugar.nome + " " +
            lugar.categoriaNome + " " +
            lugar.descricao + " " +
            lugar.endereco
        );

        const correspondePesquisa = textoCompleto.includes(termo);

        const correspondeCategoria =
            categoriaSelecionada === "todas" ||
            lugar.categoria === categoriaSelecionada;

        return correspondePesquisa && correspondeCategoria;
    });

    lista.replaceChildren();
    camadaMarcadores.clearLayers();

    contador.textContent =
        encontrados.length +
        (encontrados.length === 1 ? " local" : " locais");

    encontrados.forEach(lugar => {
        // Cartão lateral
        const botao = document.createElement("button");
        botao.type = "button";
        botao.className = "cartao-lugar";

        const nome = criarElemento("strong", lugar.nome);

        const descricao = criarElemento(
            "span",
            lugar.categoriaNome + " — " + lugar.descricao
        );

        botao.append(nome, descricao);

        botao.addEventListener("click", () => {
            abrirLugar(lugar);
        });

        lista.appendChild(botao);

        // Marcador no mapa
        const marcador = L.marker([
            lugar.latitude,
            lugar.longitude
        ]);

        marcador.bindPopup(criarPopup(lugar));
        marcador.addTo(camadaMarcadores);

        marcador.on("click", () => {
            marcador.openPopup();
        });
    });

    if (encontrados.length === 0) {
        lista.appendChild(
            criarElemento(
                "p",
                "Nenhum lugar encontrado. Tente outra pesquisa ou categoria.",
                "aviso"
            )
        );
    }
}

// ========================================
// 7. EVENTOS
// ========================================

pesquisa.addEventListener("input", renderizarLugares);

categoria.addEventListener("change", renderizarLugares);

botaoVoltar.addEventListener("click", () => {
    mapa.closePopup();
    mapa.setView(centroRecife, zoomInicial);
});

// Carregar a lista ao abrir o site.
renderizarLugares();
