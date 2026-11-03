# FitG

Nome escolhido pelo usuario para o aplicativo anteriormente chamado Vigritmo e Shape 26/12. A meta pessoal de 26/12 continua editavel e nao define a identidade do produto. A disponibilidade comercial de FitG nao foi verificada; a triagem anterior se refere somente a Vigritmo. Consulte [AUDITORIA.md](AUDITORIA.md) para evidencias e limites da verificacao.

O banco IndexedDB permanece com a chave legada `shape-26-12` para preservar os registros existentes na mesma origem. Backups JSON versao 1 continuam compativeis; somente o nome do arquivo exportado muda.

Aplicativo pessoal local-first para alimentacao, treinos e evolucao corporal. React + TypeScript + Vite, Tailwind, Dexie/IndexedDB, Recharts e PWA. Sem backend, telemetria ou deploy.

## Versoes e atualizacao

Consulte [CHANGELOG.md](CHANGELOG.md) para correcoes e compatibilidade. A versao do app aparece no rodape; banco e backup continuam no schema 1, independentemente da versao do aplicativo.

A PWA avisa quando ha nova versao. Feche ou conclua formularios e confirme a recarga; registros salvos permanecem locais. A versao 0.1.0 ainda nao tinha esse aviso: para receber a primeira atualizacao, pode ser necessario fechar todas as abas e reabrir, sem limpar dados do navegador.

Backups com modo dinamico sao aceitos somente apos confirmacao explicita para usar a meta fixa do proprio arquivo. A interface ainda nao configura atividade incremental para meta dinamica.

## Executar localmente

Node.js 24 LTS e npm. Na raiz:

```sh
npm ci
npm run dev
```

Abra o endereco mostrado pelo Vite (normalmente http://127.0.0.1:5173). Uma porta ocupada nao e substituida: o Vite procura a proxima disponivel.

```sh
npm run typecheck
npm run test
npm run build
npm run preview
```

`test` executa uma vez, sem watch. `preview` serve o build local, normalmente na porta 4173; e nele que o service worker/offline deve ser testado. Nao e um servidor de producao. Nao ha escolha de hospedagem, dominio ou caminho-base de publicacao.

### Celular na rede local

Se o servidor ja estiver ativo, reutilize o endereco e a porta atuais. Para iniciar um servidor acessivel pelo celular na mesma rede confiavel, quando nao houver um em uso:

```sh
npm run dev -- --host 0.0.0.0 --port 5174 --strictPort
```

Abra no celular o endereco `Network` mostrado pelo Vite. `--strictPort` impede a troca silenciosa de porta. Preserve a mesma origem/porta para continuar acessando os registros; nao limpe os dados do navegador. O acesso HTTP permite registros locais e importacao GPX/TCX, mas nao habilita instalacao/offline da PWA no iPhone. IDs e SHA-256 nao dependem de APIs exclusivas de contexto seguro.

## Implementado nesta primeira versao

- Home com tema Laranja Energia, indicadores circulares e destaques fotograficos locais de Nutricao, Performance e Evolucao. Sidebar desktop, navegacao inferior mobile, safe areas e data compacta com retorno a hoje. Treinos, Evolucao e Perfil preservam suas composicoes existentes.
- Alimentacao com faixa semanal, resumo compacto, anel de 144 px no desktop ao lado das calorias restantes/consumidas e tres progressos de macros. Refeicoes em linhas horizontais de aproximadamente 100 px no desktop, com duas colunas apenas em telas amplas; area do card abre detalhes, mantendo acoes separadas de registro e opcoes. Detalhes usam o mesmo modal, como painel lateral no desktop e folha inferior no mobile. Sem painel lateral redundante; criacao de refeicoes junto ao titulo e doces em secao secundaria compacta. Mobile preserva a acao central de novo registro. Sem consumo conhecido, indicadores permanecem desconhecidos. Como nao ha fotos de refeicoes cadastradas, os cards usam icone neutro em vez de imagens ficticias.
- Perfil e metas editaveis, seis refeicoes planejadas e semana de treinos de referencia, sem registros historicos pre-fabricados.
- Catalogo nutricional aproximado e editavel, com fonte/base/unidade. Porcoes sem escolha ou quantidade permanecem desconhecidas.
- Editor de consumo com nome editavel, quatro indicadores nutricionais, selecao, quantidades/unidades e inclusao/remocao de ingredientes. Personalizacao preserva o rascunho. Folha inferior no mobile, modal amplo no desktop e rodape de salvar visivel durante a rolagem. Edicao/exclusao do plano ficam no menu de opcoes, com confirmacao para excluir.
- Consumos preservam snapshots; editar o plano ou catalogo nao reescreve historico. Consumos salvos, inclusive avulsos e de planos excluidos, podem ser editados ou desfeitos no painel de detalhes. Ajustar uma porcao usa os nutrientes registrados; substituir explicitamente um alimento usa o catalogo atual. Novo registro da mesma refeicao/data substitui o anterior. Registro avulso nao cria refeicao no plano.
- Treinos manuais com inicio, modalidade, duracao, distancia, frequencia cardiaca, energia informada/tipo, notas e exercicios com series/repeticoes/carga; edicao/exclusao.
- Home de consulta diaria: os cards e indicadores abrem Alimentacao, Treinos e Evolucao; o preenchimento permanece nesses menus. Aneis de calorias e proteina usam consumo conhecido e metas validas, sem transformar ausencia de dados em zero. Consistencia conta dias com alimentacao ou treino registrados nos ultimos sete dias, nao adesao ao plano nem pontuacao de saude. Peso e minigrafico usam somente pesagens reais ate a data selecionada; sem historico suficiente, nao ha tendencia inventada. Macros, saldo, treino, peso e historico detalhados continuam em Resumo e historico. Meta fixa nao repoe automaticamente o treino; saldo exige consumo conhecido e TDEE informado com origem. Energia desconhecida/total nao entra na soma de energia ativa.
- Peso com data/notas, media dos registros de sete dias, variacao, exclusao e graficos de peso, consumo, proteina e frequencia de treino em 7/30 dias.
- Dias de doces explicitamente registrados, desfazer, calendario, sequencia, recorde e percentual sobre dias registrados. Dias ausentes nao viram dias sem doces.
- IndexedDB versionado, inicializacao idempotente, validacao com Zod e backup JSON validado/restaurado em transacao atomica apos confirmacao.
- Importacao local GPX/TCX em Web Worker com progresso, limite de arquivo, revisao, arquivo repetido ignorado e possiveis duplicatas desmarcadas por padrao.
- Manifest, icones PNG e service worker para cache do app e fontes locais. Registros locais nao exigem rede apos o primeiro carregamento do build.

## Energia e limites

O saldo e ingestao menos TDEE, nunca ingestao menos exercicio. TDEE e uma estimativa manual opcional com origem; nao e calculado a partir da idade/altura sem entradas suficientes. O TDEE mostrado no grafico e a configuracao atual aplicada como referencia, nao uma medicao historica. Valores de alimentos sao aproximados e totais com itens desconhecidos sao parciais.

O motor puro tem testes para modo fixo e dinamico. A interface desta primeira versao expoe apenas meta fixa; o modo dinamico ainda depende de um fluxo de confirmacao da energia incremental e base sem exercicio. Nao ha recomendacao automatica de comer calorias do treino.

Metas nao sao prescricao medica. Variacao de peso nao significa necessariamente variacao de massa muscular.

## Importadores suportados

Arquivos GPX ou TCX XML, ate 10 MB e 500 atividades por arquivo. Processamento no dispositivo, sem upload. XML malformado e DTD/entidades sao rejeitados; arquivos sem campos obrigatorios nao sao importados parcialmente.

| Formato | Campos importados                                                                                                                                | Ausencias/limites                                                                                                      |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| GPX     | Nome, modalidade reconhecida, inicio com fuso, duracao decorrida dos horarios dos pontos                                                         | Requer track e pelo menos dois horarios ordenados; nao importa rotas sem horario, distancia, FC, energia ou extensoes  |
| TCX     | Modalidade, inicio com fuso, soma da duracao de voltas, distancia em km, calorias e FC media ponderada quando todas as voltas informam os campos | Calorias entram com tipo desconhecido; nao sao automaticamente energia ativa. Sem FIT, extensoes ou arquivos de cursos |

O ID de importacao e o SHA-256 do arquivo mais indice da atividade. Um arquivo diferente e analisado por proximidade de inicio (10 minutos), duracao (5 minutos ou 15%) e modalidade. Possiveis duplicatas ficam desmarcadas; marcar significa confirmar um treino distinto. Verifique a modalidade `Outro` apos importar.

## PWA e iPhone

O service worker fica desativado no `dev` para nao interferir em edicoes. Para verificar offline: gerar build, executar preview, abrir conectado, aguardar instalacao do service worker, recarregar e depois desligar a rede. Cache e IndexedDB sao independentes. Atualizacoes nao recarregam um formulario automaticamente; feche todas as abas e reabra para ativar uma versao nova.

A instalacao e o service worker no iPhone requerem Safari e contexto seguro compativel. `127.0.0.1` no computador nao e acessivel pelo iPhone. Os registros e importacoes locais podem ser usados pelo endereco HTTP da rede, mas instalacao/offline no aparelho exige acesso seguro configurado separadamente. Esta entrega nao configura HTTPS, hospedagem ou publicacao. Layout e fluxos mobile foram verificados por viewport e toque em Chromium; Safari, teclado virtual, HealthKit e instalacao em iPhone fisico ainda nao foram homologados.

Para regenerar os icones locais: `node scripts/generate-icons.mjs`.

## Privacidade e backup

Dados ficam neste dispositivo e nesta origem do navegador. Trocar porta/origem, usar outro navegador, limpar armazenamento ou desinstalar pode tornar os dados indisponiveis. Exporte backups regularmente. O JSON inclui dados de saude em texto legivel; guarde-o com cuidado. Restauracao substitui todos os dados e exige confirmacao. Limite de backup: 20 MB.

Nao ha fotos pessoais nesta versao; o backup inclui todos os registros implementados. As fotografias ilustrativas da Home, fontes e icones sao assets locais, com as imagens incluidas no precache da PWA. Origens e licenca em [public/images/README.md](public/images/README.md). Nao armazenamos imagens no localStorage; nao ha CDN durante o uso, analytics ou chamadas de API de saude.

## Proximas etapas e integracoes nao implementadas

- Expor meta dinamica somente com origem, base sem exercicio e confirmacao de atividade incremental para evitar dupla contagem.
- Edicao do plano semanal, catalogo com criacao de novos alimentos, medidas corporais, fotos opcionais, marcos editaveis e progressao/volume de cargas.
- Apple Health XML/ZIP e FIT ainda nao suportados. Nao existe acesso direto a Apple Watch/HealthKit pela PWA.
- Strava nao conectado: contratos de `StravaAdapter`, `ActivityMapper` e `SyncService` em `src/integrations/strava/contracts.ts`. Um futuro servico seguro deve fazer OAuth/token exchange/refresh, validar state, respeitar scopes/rate limits e guardar tokens fora do frontend. Usar sessao HttpOnly/Secure, protecao CSRF e consentimento; nunca secrets em `VITE_*`.
- Fronteira nativa `HealthKitAdapter` em `src/integrations/apple-health/contracts.ts`. Plugin Capacitor real, permissoes de leitura e testes em dispositivo iOS sao futuros; nao ha projeto Xcode/plugin implementado.
- Associacoes de duplicatas ainda nao sao mescladas entre fontes; nesta versao a revisao permite ignorar a entrada ou confirmar que e outra atividade.

## Verificacao e dependencias

Auditoria mobile: 56 testes em seis arquivos, typecheck, build e auditoria de runtime aprovados. Toda a suite da interface roda sem `crypto.randomUUID` nem `crypto.subtle`. Playwright conferiu o HTTP real da rede local: plano/consumo parcial/avulso/edicao/desfazer, treino com exercicio, peso, doces, perfil/catalogo, backup valido/invalido e GPX/TCX com deduplicacao e erros. Cinco abas e integracoes em 320/390/430 px, sem overflow da pagina; menu com itens livres para toque imediatamente apos salvar. No preview do build em loopback, recarga offline preservou consumo, peso gravado offline persistiu e GPX foi importado pelo Worker sem rede. Contextos isolados, sem alterar dados do usuario. Evidencias e limites em [AUDITORIA.md](AUDITORIA.md); nao certifica Safari/iPhone fisico ou PWA no HTTP da rede local.

Sprint 10.1: layout medido no Playwright MCP em 1366x768 e 390x844. Resumo desktop de 282 px, anel de 144 px, cards de 100 px e duas refeicoes inteiras na primeira dobra. Mobile com resumo de 298 px e primeira refeicao inteira acima da acao flutuante, sem transbordamento horizontal. Clique na area do card, opcoes de editar/excluir, detalhes laterais de 420 px, modal mobile, criacao de plano, consumo parcial de 415,3 kcal, persistencia apos recarregar e desfazer conferidos em contexto isolado; nenhum erro JavaScript. Sem alteracao no banco, dominio nutricional ou dependencias. Nao certifica Safari/iPhone fisico ou teclado virtual.

Sprint 10: 51 testes, typecheck e build aprovados. Alimentacao conferida no Playwright MCP em 320, 430 e 1440 px, sem accordions de refeicoes, transbordamento ou erros JavaScript. Validacao em contexto isolado: navegacao por dia, consumo parcial de 400,5 kcal, ingredientes adicionados/removidos, persistencia apos recarregar, edicao para 440,5 kcal, registro avulso, desfazer e retorno de foco por Escape. Rodape de salvar, ultima porcao e quantidades legiveis verificados nos tres tamanhos; modal desktop com 760 px. Aviso de sucesso nao cobre a acao central. Banco/schema/backup permanecem inalterados. Nao certifica teclado virtual, Safari/iPhone fisico, instalacao ou offline em dispositivo.

Sprint 09: 47 testes, typecheck e build aprovados. Home conferida no Playwright MCP em 320, 430 e 1440 px, com imagens locais carregadas, sem rolagem horizontal da pagina ou erros JavaScript. Alimentacao parcial, treino, duas pesagens, persistencia apos recarregar e acesso ao Perfil por teclado foram verificados em contexto isolado, sem alterar a base do usuario. Fotografias presentes no precache gerado. Nao certifica Safari/iPhone fisico, teclado virtual, instalacao ou operacao offline em dispositivo.

Testes cobrem dominio energetico, porcoes/snapshots, datas invalidas, doces, IndexedDB/backup, GPX/TCX e fluxo da interface. Revisar tambem formulacao de dados desconhecidos e os controles no navegador ao mudar regras.

A revisao de usabilidade foi validada com 45 testes, typecheck e build. No Playwright MCP, as cinco telas couberam em 320, 430 e 1440 px, fechadas e com detalhes expandidos. Registro parcial, alternancia de personalizacao, persistencia apos recarregar, desfazer, teclado/foco e menu contextual foram conferidos em sessao isolada. Digitacao caractere a caractere de uma fracao foi validada sem falha durante o zero temporario; quantidade invalida bloqueia envio, e alimentos desmarcados nao bloqueiam a validacao. Nao certifica teclado virtual, Safari/iPhone fisico, instalacao ou operacao offline da PWA.

A auditoria inicial encontrou vulnerabilidades no executor de testes; o Vitest foi atualizado para elimina-las. Restaram avisos baixos/moderados em dependencias transitivas da toolchain PWA apos `npm audit fix`; `npm audit --omit=dev` nao apontou vulnerabilidades de runtime na verificacao desta entrega. Reavaliar a auditoria ao atualizar dependencias.

Escopo completo: [SYSTEM_PROMPT.md](SYSTEM_PROMPT.md). Convencoes: [.github/copilot-instructions.md](.github/copilot-instructions.md).
