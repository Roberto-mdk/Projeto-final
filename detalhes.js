
"use strict";

// Dados demonstrativos.
// As informações devem ser verificadas antes da publicação.

const lugaresDetalhados = {
    "1": {
        nome: "Marco Zero",
        categoria: "Praça e referência urbana",
        descricao:
            "O Marco Zero, localizado na Praça Rio Branco, é uma das referências mais conhecidas do Bairro do Recife. A região ajuda a compreender a formação urbana, cultural e econômica da cidade.",
        endereco: "Praça Rio Branco, Bairro do Recife, Recife - PE",
        periodo: "História urbana do Recife",
        latitude: -8.0631,
        longitude: -34.8711,
        imagem: "",
        fonte: "Consultar fontes oficiais municipais e patrimoniais."
    },

    "2": {
        nome: "Rua do Bom Jesus",
        categoria: "Rua histórica",
        descricao:
            "A Rua do Bom Jesus integra o conjunto histórico do Bairro do Recife. Sua arquitetura e seu espaço urbano oferecem oportunidades para pesquisar diferentes períodos da história da cidade.",
        endereco: "Bairro do Recife, Recife - PE",
        periodo: "História urbana e cultural",
        latitude: -8.0618,
        longitude: -34.8715,
        imagem: "",
        fonte: "Consultar fontes oficiais e patrimoniais."
    },

    "3": {
        nome: "Paço do Frevo",
        categoria: "Cultura e patrimônio",
        descricao:
            "O Paço do Frevo é um espaço cultural dedicado à preservação, pesquisa e difusão do frevo, manifestação fundamental da cultura pernambucana.",
        endereco: "Praça do Arsenal da Marinha, Bairro do Recife, Recife - PE",
        periodo: "Memória e cultura do frevo",
        latitude: -8.0617,
        longitude: -34.8710,
        imagem: "",
        fonte: "Consultar o site oficial do Paço do Frevo."
    },

    "4": {
        nome: "Forte do Brum",
        categoria: "Fortificação histórica",
        descricao:
            "O Forte do Brum é uma fortificação histórica do Recife. Sua trajetória pode ser estudada a partir da história militar, da defesa territorial e das transformações da cidade.",
        endereco: "Bairro do Recife, Recife - PE",
        periodo: "História militar e colonial",
        latitude: -8.0525,
        longitude: -34.8714,
        imagem: "",
        fonte: "Consultar fontes oficiais do museu e do patrimônio."
    },

    "5": {
        nome: "Mercado de São José",
        categoria: "Comércio tradicional",
        descricao:
            "O Mercado de São José está ligado à história do comércio popular, do abastecimento e da vida cotidiana do Recife.",
        endereco: "Bairro de São José, Recife - PE",
        periodo: "História do comércio recifense",
        latitude: -8.0687,
        longitude: -34.8780,
        imagem: "",
        fonte: "Consultar fontes oficiais municipais e patrimoniais."
    }
};

const conteudo = document.getElementById("conteudo-lugar");
const parametros = new URLSearchParams(window.location.search);
const id = parametros.get("id");
const lugar = lugaresDetalhados[id];

function adicionarTexto(container, tag, texto, classe = "") {
    const elemento = document.createElement(tag);
    elemento.textContent = texto;

    if (classe) {
        elemento.className = classe;
    }

    container.appendChild(elemento);
}

function exibirLugar(dado) {
    conteudo.replaceChildren();

    adicionarTexto(conteudo, "p", dado.categoria, "categoria-detalhe");
    adicionarTexto(conteudo, "h1", dado.nome);
    adicionarTexto(conteudo, "p", dado.descricao, "descricao-detalhe");

    const imagem = document.createElement("div");
    imagem.className = "imagem-detalhe";

    if (dado.imagem) {
        const foto = document.createElement("img");
        foto.src = dado.imagem;
        foto.alt = "Fotografia de " + dado.nome;
        imagem.appendChild(foto);
    } else {
        imagem.textContent = "Fotografia do local a ser adicionada";
        imagem.setAttribute("role", "img");
        imagem.setAttribute("aria-label", imagem.textContent);
    }

    conteudo.appendChild(imagem);

    adicionarTexto(conteudo, "h2", "Sobre este lugar");
    adicionarTexto(conteudo, "p", dado.descricao);

    adicionarTexto(conteudo, "h2", "Período histórico");
    adicionarTexto(conteudo, "p", dado.periodo);

    adicionarTexto(conteudo, "h2", "Localização");
    adicionarTexto(conteudo, "p", dado.endereco);

    const coordenadas = document.createElement("p");
    coordenadas.textContent =
        "Latitude: " + dado.latitude +
        " | Longitude: " + dado.longitude;

    conteudo.appendChild(coordenadas);

    const linkMapa = document.createElement("a");
    linkMapa.className = "botao-detalhe";
    linkMapa.href =
        "https://www.openstreetmap.org/?mlat=" +
        encodeURIComponent(dado.latitude) +
        "&mlon=" +
        encodeURIComponent(dado.longitude) +
        "#map=17/" +
        encodeURIComponent(dado.latitude) +
        "/" +
        encodeURIComponent(dado.longitude);

    linkMapa.target = "_blank";
    linkMapa.rel = "noopener noreferrer";
    linkMapa.textContent = "Ver localização no mapa";

    conteudo.appendChild(linkMapa);

    adicionarTexto(conteudo, "h2", "Fontes e referências");
    adicionarTexto(
        conteudo,
        "p",
        dado.fonte,
        "fonte-detalhe"
    );

    adicionarTexto(
        conteudo,
        "p",
        "Este registro é demonstrativo. Confirme os dados e registre referências verificáveis antes da publicação.",
        "aviso-detalhe"
    );
}

if (lugar) {
    exibirLugar(lugar);
} else {
    conteudo.replaceChildren();

    adicionarTexto(conteudo, "h1", "Lugar não encontrado");
    adicionarTexto(
        conteudo,
        "p",
        "Não foi possível encontrar esse registro. Volte ao mapa e selecione outro lugar."
    );

    const link = document.createElement("a");
    link.href = "index.html";
    link.className = "botao-detalhe";
    link.textContent = "Voltar ao mapa";

    conteudo.appendChild(link);
}
