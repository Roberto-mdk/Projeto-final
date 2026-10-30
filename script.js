
const lugares = [
    {
        id: 1,
        nome: "Marco Zero",
        categoria: "Praça e referência histórica",
        descricao: "Ponto conhecido do Bairro do Recife e referência para explorar a região histórica.",
        latitude: -8.0631,
        longitude: -34.8711
    },
    {
        id: 2,
        nome: "Rua do Bom Jesus",
        categoria: "Rua histórica",
        descricao: "Uma rua emblemática do Recife Antigo, associada à história urbana e cultural da cidade.",
        latitude: -8.0618,
        longitude: -34.8715
    },
    {
        id: 3,
        nome: "Paço do Frevo",
        categoria: "Cultura e patrimônio",
        descricao: "Espaço cultural dedicado à memória, à documentação e à difusão do frevo.",
        latitude: -8.0617,
        longitude: -34.8710
    },
    {
        id: 4,
        nome: "Forte do Brum",
        categoria: "Fortificação histórica",
        descricao: "Fortificação histórica que ajuda a contar a história militar e urbana do Recife.",
        latitude: -8.0525,
        longitude: -34.8714
    },
    {
        id: 5,
        nome: "Mercado de São José",
        categoria: "Mercado e patrimônio",
        descricao: "Mercado histórico ligado ao comércio tradicional e à vida cotidiana do Recife.",
        latitude: -8.0687,
        longitude: -34.8780
    }
];

// Criar o mapa centrado no Recife Antigo.
const mapa = L.map("mapa").setView([-8.0618, -34.8720], 15);

// Adicionar o mapa-base do OpenStreetMap.
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(mapa);

const camadaMarcadores = L.layerGroup().addTo(mapa);
const lista = document.getElementById("lista-lugares");
const pesquisa = document.getElementById("pesquisa");
const contador = document.getElementById("contador");

function abrirLugar(lugar) {
    mapa.setView(
        [lugar.latitude, lugar.longitude],
        17,
        { animate: true }
    );

    // Abre o resumo do lugar no mapa.
    L.popup()
        .setLatLng([lugar.latitude, lugar.longitude])
        .setContent(`
            <div class="popup-lugar">
                <strong>${lugar.nome}</strong>
                <p>${lugar.categoria}</p>
                <p>${lugar.descricao}</p>
            </div>
        `)
        .openOn(mapa);
}

function renderizarLugares(termo = "") {
    const busca = termo
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

    const encontrados = lugares.filter(lugar => {
        const texto = (
            lugar.nome + " " +
            lugar.categoria + " " +
            lugar.descricao
        )
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();

        return texto.includes(busca);
    });

    lista.replaceChildren();
    camadaMarcadores.clearLayers();

    contador.textContent =
        encontrados.length +
        (encontrados.length === 1 ? " local" : " locais");

    encontrados.forEach(lugar => {
        const botao = document.createElement("button");
        botao.type = "button";
        botao.className = "cartao-lugar";

        const nome = document.createElement("strong");
        nome.textContent = lugar.nome;

        const descricao = document.createElement("span");
        descricao.textContent =
            lugar.categoria + " — " + lugar.descricao;

        botao.append(nome, descricao);
        botao.addEventListener("click", () => abrirLugar(lugar));
        lista.appendChild(botao);

        const marcador = L.marker([
            lugar.latitude,
            lugar.longitude
        ]).addTo(camadaMarcadores);

        marcador.bindPopup(`
            <strong>${lugar.nome}</strong>
            <p>${lugar.categoria}</p>
            <p>${lugar.descricao}</p>
        `);

        marcador.on("click", () => {
            // Mantém a seleção do lugar ligada ao marcador.
            marcador.openPopup();
        });
    });
}

pesquisa.addEventListener("input", evento => {
    renderizarLugares(evento.target.value);
});

renderizarLugares();
