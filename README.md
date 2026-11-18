# NEXUS | Urban Intelligence — atualização da interface

Esta atualização organiza a interface do NEXUS como um painel de gestão de construções civis e geolocalização, preservando a instância do mapa 3D já existente no projeto.

## O que esta versão acrescenta

- Painel de indicadores e portfólio de obras.
- Áreas de navegação: visão geral, mapa, obras, cronogramas, relatórios e profissionais.
- Cadastro, edição e exclusão de projetos.
- Pesquisa e filtros por situação e categoria.
- Painel lateral de detalhes de cada construção.
- Exportação dos registros para CSV.
- Camadas de edificações, obras, vias, áreas verdes e água, quando disponíveis no estilo do mapa conectado.
- Agrupamento (cluster) dos marcadores de obras e identificação por situação.
- Ferramenta demonstrativa de medição de distâncias e áreas.
- Alternância visual diurna/noturna, mantendo a mesma instância do mapa.
- Salvamento local via localStorage.
- Vite, GitHub Actions, CodeQL e Dependabot.

> Os dados iniciais são fictícios e servem apenas para demonstração. O armazenamento é local ao navegador; não há sincronização entre usuários nem conexão com uma base oficial de obras.

## IMPORTANTE — preservar o mapa atual

O mapa 3D do seu repositório atual não deve ser apagado ou substituído. Como o código exato do seu `js/mapa3d.js` não foi fornecido nesta conversa, esta atualização integra a interface a uma instância MapLibre já inicializada.

Antes de testar, copie os arquivos atuais para o diretório `public` desta forma, mantendo também os originais como backup:

| Arquivo atual | Cópia que deve ser criada |
|---|---|
| `js/mapa3d.js` | `public/js/mapa3d.js` |
| `script.js` | `public/script.js` |
| `dados/config.js` | `public/dados/config.js` |
| `dados/obras.js` | `public/dados/obras.js` |

Os arquivos antigos são carregados em ordem pelo `index.html`. Se o seu `script.js` antigo contiver funcionalidades duplicadas ou uma segunda inicialização de mapa, desative apenas o trecho duplicado depois de testar; não exclua a inicialização original do mapa.

### Uma linha de integração necessária

Abra a cópia `public/js/mapa3d.js`. Localize a linha em que a instância do mapa é criada, parecida com:

```js
const map = new maplibregl.Map({
  container: 'mapa',
  // mantenha aqui as opções atuais do seu mapa
});
```

Imediatamente depois da criação da instância, acrescente:

```js
window.NEXUS_MAP = map;
```

Se a variável não se chama `map`, use o nome real dela. Exemplo: `window.NEXUS_MAP = mapa3D;`.

Isso permite que a nova interface adicione as camadas de projetos à instância existente sem recriar o mapa nem alterar a câmera e o estilo atuais.

Se o arquivo atual não usa MapLibre ou não expõe uma instância compatível, a interface continuará aparecendo, mas as camadas, a medição e os controles de câmera não poderão controlar o mapa até a adaptação do conector.

## Instalação no GitHub Codespaces

Use o terminal na pasta raiz do projeto, onde está o `package.json`:

```bash
npm install
```

Depois inicie o servidor:

```bash
npm run dev -- --host 0.0.0.0
```

Abra a porta `5173` quando o Codespaces oferecer a opção.

Para validar e gerar a versão final:

```bash
npm run check
npm run build
npm run preview -- --host 0.0.0.0
```

O build de produção fica em `dist/`.

## GitHub Actions e CodeQL

- `.github/workflows/ci.yml` executa instalação, verificação de sintaxe e build nas alterações em `main` e em pull requests.
- O workflow CodeQL que você já habilitou deve ser mantido. Há um exemplo opcional em `.github/examples/codeql.workflow.example.yml`, mas não o ative se já existir uma análise CodeQL no repositório.
- `.github/dependabot.yml` verifica atualizações de dependências npm e GitHub Actions semanalmente.

Não mantenha dois workflows CodeQL ativos para a mesma análise, pois isso duplica execução e consumo de minutos. Confira a aba **Actions** após o primeiro commit. O workflow CI usa `npm install` enquanto o primeiro `package-lock.json` ainda não foi criado; depois de executar `npm install` no Codespaces e confirmar o `package-lock.json` no Git, pode trocar a etapa do CI para `npm ci` e habilitar o cache npm.

## Observações técnicas

- Vite é utilizado como servidor de desenvolvimento e ferramenta de build.
- A versão MapLibre 5.6.2 do projeto antigo é mantida no carregamento CDN para reduzir o risco de uma atualização principal quebrar o mapa existente.
- A alternância dia/noite aplica um filtro visual ao canvas do mapa. Uma noite com iluminação individual de postes e fachadas exigirá um estilo de mapa e dados de iluminação próprios.
- As camadas urbanas só podem ser ativadas quando o estilo conectado contiver camadas correspondentes. A interface não inventa dados de ruas, parques, hidrografia ou edificações.
- A medição usa cálculo geográfico aproximado para fins demonstrativos. Não substitui levantamento topográfico ou medição técnica de engenharia.
- O `localStorage` é adequado para protótipo. Um produto multiusuário exigirá API e banco de dados.
