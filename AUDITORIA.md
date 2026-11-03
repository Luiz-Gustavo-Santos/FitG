# Auditoria do FitG

Data: 2026-11-03. Produto anteriormente chamado Vigritmo e Shape 26/12.

Atualizacao de identidade: FitG foi escolhido pelo usuario apos esta auditoria. As evidencias historicas e a triagem de nome abaixo se referem a Vigritmo; nao certificam disponibilidade de FitG. Banco e schema de backup permanecem inalterados; novas exportacoes usam o prefixo `fitg-backup-`.

## Parecer

Atualizacao da sprint 0.2.0: A01, A02, A03, A04, A05, A06 e A08 receberam correcoes e testes de regressao. Os achados abaixo preservam a evidencia original da versao 0.1.0, nao descrevem todos o estado atual. A09 teve correcao das datas e do subtitulo; revisao completa de acessibilidade continua pendente. A07 permanece sob acompanhamento. Consulte [CHANGELOG.md](CHANGELOG.md).

Verificacao da sprint: 33 testes em 5 arquivos aprovados; typecheck e build aprovados; auditoria de dependencias de runtime com zero vulnerabilidades. No navegador, foram verificados consumo sem plano, desfazer, GPX com duplicatas internas, edicao de duracao fracionaria e atualizacao real de 0.2.0-rc.1 para 0.2.0. O aviso bloqueou o rascunho aberto e, apos confirmacao, a nova versao manteve o consumo salvo. Os registros temporarios foram removidos pela interface. Capturas desktop/mobile e cinco telas em 320/390 px sem overflow.

Limite desta verificacao: o contexto integrado alternou a conexao para online durante os reloads e nao concluiu de forma consistente a chamada de simulacao de rede. Assim, o teste offline automatizado da 0.2.0 ficou inconclusivo; os testes offline anteriores da 0.1.0 nao substituem uma nova verificacao em navegador/dispositivo independente. Multiplas abas, iPhone fisico, acessibilidade completa, licencas comerciais e disponibilidade juridica de FitG continuam pendentes. Esta release e uma base de desenvolvimento, nao uma certificacao comercial.

A entrega e uma primeira versao local funcional, nao a implementacao integral da especificacao. Alimentacao, treinos manuais, peso, doces, backup, graficos, importacao GPX/TCX e PWA possuem caminhos reais de uso. Existem defeitos de integridade da apresentacao e da importacao que devem ser corrigidos antes de considerar o fluxo plenamente aceito.

Esta etapa alterou a marca e adicionou protecao de regressao para o nome publico e o banco legado. Os problemas abaixo permanecem abertos, salvo indicacao explicita. Auditoria nao equivale a correcao de todos os achados.

## Achados Priorizados

### A01 - Alta: consumo fica sem acesso apos excluir refeicao do plano

- Evidencia: [Nutrition.tsx](src/pages/Nutrition.tsx) renderiza apenas `data.meals`; a exclusao remove o plano, mas nao o registro em `logs`. O botao de desfazer existe somente no card da refeicao atual.
- Reproducao: registrar o cafe da manha, excluir essa refeicao do plano e consultar Alimentacao. O consumo continua afetando os totais, mas deixa de ter card para consultar ou desfazer. Em banco temporario, a exclusao deixou um log, nenhum plano correspondente e um backup ainda valido.
- Problema relacionado: ingredientes exibidos em refeicoes ja consumidas vem do plano atual, nao do snapshot salvo. Editar o plano pode apresentar itens diferentes dos efetivamente registrados.
- Impacto: historico armazenado nao e apagado, mas sua consulta e correcao ficam incompletas; indicadores de refeicoes podem divergir do plano atual.
- Recomendacao: renderizar consumos pelos snapshots, independentemente da existencia do plano; oferecer edicao/desfazer pelo ID do registro. Separar visualmente o plano futuro do historico.

### A02 - Alta: ausencia ou desconhecimento de consumo aparece como numero conclusivo

- Evidencia: [dashboard.ts](src/domain/dashboard.ts), [nutrition.ts](src/domain/nutrition.ts) e [Home.tsx](src/pages/Home.tsx).
- Reproducao em memoria: perfil com TDEE de 2.500 kcal e nenhum log retorna saldo de -2.500 kcal. Um log contendo apenas um alimento de nutrientes desconhecidos gera `intake: 0` e `protein: 0` no historico.
- Impacto: ausencia de registro pode parecer deficit real; um consumo desconhecido pode parecer zero. A legenda generica de valores conhecidos nao distingue a completude de cada ponto.
- Recomendacao: transportar estado de ausencia/completude junto aos totais; mostrar saldo desconhecido sem registros e identificar explicitamente saldos parciais. Graficos nao devem converter desconhecidos integrais em zeros medidos.
- Regra correta preservada: quando informado, o saldo usa ingestao menos TDEE, nunca ingestao menos somente exercicio; a meta fixa nao recebe automaticamente calorias de treino.

### A03 - Media: duplicatas internas do mesmo lote nao passam pela revisao adequada

- Evidencia: [Integrations.tsx](src/pages/Integrations.tsx) compara candidatos com os registros persistidos, mas nao entre si; a gravacao revalida apenas correspondencias exatas contra o banco.
- Reproducao em memoria: GPX com duas trilhas identicas gera dois candidatos classificados como `possible` entre si, mas ambos ficam pre-selecionados quando o banco esta vazio. IDs `hash:indice` diferentes impedem a deteccao exata desse caso.
- Impacto: duplicacao de frequencia, duracao e eventual energia classificada pelo usuario. Um conflito ambiguo introduzido por outra operacao entre revisao e gravacao tambem nao exige nova confirmacao.
- Recomendacao: verificar o lote contra si mesmo e contra o estado mais recente do banco, na transacao; exigir decisao para conflitos ambiguos e preservar rastreabilidade.

### A04 - Media: precisao importada e incompatibilidade com o formulario

- Evidencia: [Editors.tsx](src/components/ui/Editors.tsx) usa duracao com passo de 0,1 minuto, distancia com passo de 0,01 km e energia com passo inteiro. O inicio e formatado somente ate minutos.
- Reproducao: GPX de 30 minutos e 1 segundo produz `30.016666666666666`; um input com o mesmo contrato do editor retorna `validity.stepMismatch: true`.
- Impacto: editar apenas notas pode ser bloqueado pela validacao nativa; salvar o inicio formatado pode descartar segundos. Outros valores fracionarios validos importados apresentam risco semelhante.
- Recomendacao: aceitar a precisao suportada pelo modelo e preservar o timestamp original quando nao alterado. Testar edicao de registros importados, nao somente criacao manual com numeros redondos.

### A05 - Media: backup dinamico valido deixa a meta sem caminho de configuracao

- Evidencia: [types/index.ts](src/types/index.ts) aceita `mode: dynamic`; [Settings.tsx](src/pages/Settings.tsx) preserva esse campo sem oferecer seletor; [dashboard.ts](src/domain/dashboard.ts) sempre fornece atividade incremental nula.
- Reproducao em memoria: backup com modo dinamico e base de 2.000 kcal passa no schema; o resumo retorna meta, TDEE e saldo nulos. A interface de Perfil se apresenta como meta fixa e nao permite voltar explicitamente a esse modo.
- Impacto: arquivo aceito pode colocar a aplicacao em um modo incompleto, sem recuperacao normal pela interface.
- Recomendacao: definir politica de compatibilidade explicita: rejeitar modo ainda nao suportado com erro compreensivel, ou permitir retorno confirmado ao modo fixo. Expor modo dinamico somente com opt-in e dados incrementais apropriados.

### A06 - Media: parser normaliza datas impossiveis

- Evidencia: [activityParser.ts](src/integrations/imports/activityParser.ts) confere formato e usa `Date.parse` antes de normalizar o timestamp.
- Reproducao: GPX com inicio `2026-02-30T10:00:00Z` foi aceito como `2026-03-02T10:00:00.000Z`.
- Impacto: atividade pode aparecer em outro dia sem informar que a origem era invalida.
- Recomendacao: validar componentes do calendario e timezone antes da conversao. O schema de dias locais ja rejeita datas impossiveis, mas essa protecao nao cobre este caminho do parser.

### A07 - Media: nove alertas transitivos da cadeia de build

- `npm audit --json` reportou 9 alertas: 2 baixos e 7 moderados; nenhum alto ou critico nesta consulta.
- Envolvidos: `deepmerge`, `glob`, `minimatch` e dependentes de Rollup/Workbox, incluindo `ejs`, `jake` e `filelist`.
- Classes de risco incluem manipulacao de prototipo e negacao de servico em dependencias transitivas. Sao riscos da ferramenta de build, nao evidencia de exploracao do aplicativo instalado.
- `npm audit --omit=dev` repetido nesta revisao retornou zero vulnerabilidades. A verificacao foi executada por tarefa do VS Code apos cancelamentos do terminal interativo.
- Recomendacao: acompanhar a cadeia Workbox/Rollup e testar atualizacoes compativeis em mudanca dedicada. `fixAvailable` nao garante que uma atualizacao automatica sem mudanca de contrato resolvera todos os alertas.

### A08 - Media: atualizacao da PWA nao tem aviso ao usuario

- Evidencia: [main.tsx](src/main.tsx) registra o service worker sem tratar o aviso de nova versao ou oferecer acao de atualizacao.
- Reproducao no preview existente: apos o build novo, o manifesto de rede dizia Vigritmo, mas o titulo e a interface continuavam Shape 26/12; o novo worker estava em `waiting`.
- Para validar a entrega, foi enviado `SKIP_WAITING` ao worker e a pagina foi recarregada, sem limpar caches ou IndexedDB. A interface passou para Vigritmo e o banco legado permaneceu presente.
- Impacto: usuarios com abas/instalacoes abertas podem permanecer na versao antiga sem perceber. A ativacao manual de auditoria nao representa um fluxo entregue ao usuario.
- Recomendacao: oferecer aviso e atualizacao confirmada, protegendo formularios abertos. Testar a passagem entre duas versoes com registros persistidos, tambem em dispositivo fisico.

### A09 - Baixa: datas literais e legibilidade exigem revisao

- [App.tsx](src/app/App.tsx) mantem `ATE 26/12`; [Home.tsx](src/pages/Home.tsx) mantem `PROJETO 26 DE DEZEMBRO`, embora a data final seja editavel.
- A marca ainda tem subtitulo em ingles, apesar do requisito de textos em portugues do Brasil.
- [styles.css](src/app/styles.css) possui textos de 8 a 11 px e diversos controles de aproximadamente 34 a 38 px. Recomenda-se ampliar alvos de toque para pelo menos 44 px e rever legibilidade real no iPhone.
- O calendario de doces deve ter nome acessivel explicito com data e estado, sem depender de cor ou descoberta do atributo `title`.
- Nao foi realizada certificacao WCAG nem teste com leitor de tela. Ausencia de overflow nao equivale a acessibilidade completa.

## Cobertura Da Especificacao

| Area | Situacao | Entrega real e limite |
| --- | --- | --- |
| Base React/TypeScript/Vite | Funcional | Scripts, dependencias, tipagem, testes e build existem. |
| Identidade e navegacao | Funcional com ressalvas | Layout mobile/desktop, cinco abas, datas, estados vazios e acoes reais; achado A09. |
| Dados iniciais | Parcial | Perfil, seis refeicoes e semana planejada; sem historico artificial. Marcos da secao 13 nao foram implementados. |
| Alimentacao | Parcial | Porcoes, consumo parcial, desconhecidos, snapshot, registro e desfazer; achados A01/A02. Catalogo permite editar existentes, nao cadastrar alimentos novos. |
| Treinos | Parcial | Modalidade, inicio, duracao, distancia, energia/tipo, frequencia cardiaca, notas, fonte e exercicios; sem progressao/volume ou edicao do plano semanal. A04. |
| Energia | Parcial | Motor puro e testado para meta fixa/dinamica, ausencia de TDEE e separacao de energia ativa. Interface apenas fixa; A02/A05. Sem calculadora completa de repouso/TDEE por formula. |
| Dashboard e graficos | Parcial | Indicadores e series 7/30 dias derivados de registros reais; completude e historico precisam de A01/A02. TDEE historico e referencia da configuracao atual, nao medicao historica. |
| Evolucao corporal | Parcial | Peso editavel por data, exclusao, media e historico. Medidas, fotos opcionais e marcos editaveis nao entregues. |
| Doces | Funcional no fluxo basico | Registros explicitos, dias desconhecidos, sequencias e denominador informado. Desempenho em historicos extensos nao medido. |
| Importacao local | Parcial | GPX/TCX reais em worker, limites, progresso, selecao e deduplicacao contra banco. A03/A04/A06. FIT e Apple Health XML/ZIP nao suportados. |
| Strava e HealthKit | Fronteiras futuras | Contratos tipados, sem conexao real, OAuth seguro, plugin Capacitor, permissoes ou testes nativos. A UI informa essas limitacoes. |
| Persistencia e backup | Funcional com ressalvas | Dexie versionado, inicializacao idempotente, validacao antes de restaurar e substituicao transacional. Apenas schema v1; migracao entre versoes futuras nao foi testada. A01/A05. |
| PWA e offline | Funcional com ressalvas | Manifest, icones, service worker e precache de assets locais. A08; instalacao em iPhone fisico e standalone nao certificados. |
| Privacidade | Local por padrao | Sem backend, telemetria ou upload implicito identificado no codigo. Dados dependem da origem/navegador e de backup manual. |

## Persistencia, Seguranca E Desempenho

Pontos positivos:

- IndexedDB permanece `shape-26-12`; nenhuma mudanca de origem, limpeza ou recriacao foi feita para renomear a marca.
- Backups continuam na versao 1; somente o prefixo do arquivo exportado passou para `vigritmo-backup-`.
- Fontes e assets locais; varredura de `src` nao encontrou chamadas `fetch`, uso de `localStorage`, variaveis `VITE_*` ou secrets. Essa varredura nao substitui auditoria de todas as dependencias.
- Restauracao valida antes de substituir dados e usa transacao. A interface pede confirmacao.
- Importador rejeita DTD/ENTITY, usa limite de 10 MB e 500 atividades, preserva ausencias e calcula fingerprint em worker.
- Nenhuma conexao ficticia com Strava/Apple Watch foi apresentada como implementada.

Riscos adicionais de escala e verificacao:

- [useAppData.tsx](src/hooks/useAppData.tsx) carrega todo o historico; os graficos repetem filtros por dia. [activities.ts](src/domain/activities.ts) pode recalcular sequencias de doces em tempo quadratico.
- Backup JSON de ate 20 MB e parseado/validado na thread principal. Fluidez com arquivo proximo do limite nao foi medida.
- O contrato de atividade nao contempla integralmente fim, status e todos os metadados/unidades explicitos da especificacao. A origem/hash ajuda rastreabilidade, mas nao equivale ao contrato completo.
- Fontes do catalogo sao aproximadas e editaveis, porem usam referencia generica TACO/USDA; falta rastreabilidade individual por alimento.
- Falta evidencia automatizada para rollback por falha durante restauracao, concorrencia de importacao, horario de verao/fusos, edicao de consumo historico e acessibilidade.
- A atualizacao da PWA foi exercitada manualmente no preview sem limpar armazenamento, mas falta o fluxo acessivel ao usuario e verificacao completa de preservacao de dados entre versoes (A08).
- Diagnosticos do editor apontam manutencao pendente: import `Plus` nao utilizado e ancora usada como botao em [App.tsx](src/app/App.tsx); `FormEvent` depreciado, tipos explicitos de botoes e avisos de espacamento em [Settings.tsx](src/pages/Settings.tsx). O projeto nao possui script dedicado de lint. Typecheck/build aprovados nao significam ausencia desses avisos de analise estatica.

## Nome Atual: FitG

**FitG** e o nome publico escolhido pelo usuario. Nao foi realizada pesquisa de disponibilidade comercial ou juridica para esse nome.

### Historico Da Triagem: Vigritmo

Escolha anterior: **Vigritmo**, combinacao de vigor e ritmo, substituida por FitG. A triagem a seguir e mantida apenas como historico, sem conclusoes aplicaveis a FitG.

Triagem publica realizada em 2026-11-03:

| Fonte | Resultado observado | Limite |
| --- | --- | --- |
| [Google Play](https://play.google.com/store/search?q=Vigritmo&c=apps&hl=pt_BR) | A pagina retornou "Nenhum resultado para Vigritmo". | Busca de vitrine, sujeita a cobertura, regiao e alteracoes. |
| [API Apple, software no Brasil](https://itunes.apple.com/search?term=vigritmo&entity=software&country=br&limit=200) | `resultCount: 0`. | Nao cobre todas as marcas, empresas, lojas ou paises. |
| Buscadores gerais | Sem correspondencia exata identificada na triagem consultada; resultados aproximados incluem nomes com raiz "Vigor". | Similaridade grafica/fonetica exige analise, nao apenas busca literal. |
| [INPI - Marcas](https://www.gov.br/inpi/pt-br/servicos/marcas) | Consultadas as orientacoes oficiais, nao concluida pesquisa de anterioridade do nome. | Registro e disponibilidade juridica continuam pendentes. |

**Nao e possivel afirmar que a marca esta juridicamente livre.** Nao foram certificados dominio, razao social, nomes de usuario ou direitos de terceiros. Antes de investimento comercial, fazer busca no INPI por grafia e fonetica nas classes pertinentes, avaliar colisoes e eventual pedido de registro com profissional habilitado. Nenhum dominio foi configurado ou reservado.

Renomeacao aplicada em interface, titulo HTML, metadados Apple, manifest, pacote/lockfile, nome de backup, documentacao e tarefas do VS Code. Identificadores internos legados permanecem quando preservam compatibilidade e nao sao marca publica.

## Evidencias De Verificacao

- Teste focado apos a renomeacao: 2 arquivos, 5 testes aprovados (interface e persistencia/backup).
- `npm ci --dry-run --ignore-scripts --no-audit --no-fund`: aprovado, sem reinstalacao.
- Reproducoes desta auditoria: A02/A03/A05 em memoria; A01 em banco temporario removido ao final; A04 via parser real e validacao nativa de input; A06 via parser real. Nenhum registro pessoal foi usado como fixture nem apagado.
- Validacoes anteriores da implementacao: 19 testes aprovados, typecheck e build aprovados; cadastro/desfazer de refeicao, treino manual, peso, persistencia apos recarregar, GPX via worker e reimportacao exata. Navegacao em 320/390 px e desktop sem overflow; preview com icones 200, SW ativo e reload offline preservando registro.
- Verificacoes completas desta revisao: `npm run typecheck`, `npm run test` (20 testes em 5 arquivos) e `npm run build` aprovados por tarefas do VS Code. O build gerou 22 entradas de precache; houve somente avisos de anotacoes PURE do Zod/Rollup, sem falha de compilacao.
- A suite inclui um teste adicional para manter o banco legado e uma assercao da nova marca no teste de interface. Esses testes nao cobrem automaticamente todos os achados reproduzidos nesta auditoria.
- Preview de producao em `http://127.0.0.1:4173/`: titulo, marca, manifesto, nome curto e metadado Apple conferidos como Vigritmo; service worker controlador ativo e banco `shape-26-12` presente. Screenshots e medicoes de desktop e menu mobile conferidos, sem overflow em 320/390 px; a marca ficou contida no menu.
- Nao verificado: iPhone fisico, instalacao/standalone real, HealthKit, OAuth, leitores de tela, penetracao exaustiva e desempenho com historico/arquivos nos limites.

## Ordem Recomendada

1. Corrigir historico de consumo e representacao de desconhecidos (A01/A02), com testes de interface e dominio.
2. Corrigir revisao de lotes, precisao de edicao e datas invalidas (A03/A04/A06).
3. Definir compatibilidade do modo dinamico em backup (A05).
4. Tratar alertas da ferramenta de build, aviso de atualizacao da PWA e acessibilidade/datas (A07/A08/A09), em mudancas delimitadas.
5. Completar catalogo proprio, semana editavel, marcos e progressao; adicionar recursos opcionais somente com persistencia e testes.
6. Concluir busca juridica do nome antes de uso comercial. Integracoes externas/native continuam condicionadas a infraestrutura e testes proprios, sem configurar deploy nesta entrega.
