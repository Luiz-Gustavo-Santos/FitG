# FitG - Instrucoes do projeto

## Fonte de verdade e escopo

- Leia [SYSTEM_PROMPT.md](../SYSTEM_PROMPT.md) antes de implementar funcionalidades. Ele define o escopo completo, os dados iniciais e os criterios de aceite; este arquivo orienta a execucao recorrente.
- Produto: aplicativo pessoal de hipertrofia, alimentacao, treinos e evolucao corporal, local-first, para iPhone e desktop. Interface e textos em portugues do Brasil.
- Nome publico: FitG, anteriormente Vigritmo e Shape 26/12. Preserve o nome legado do banco IndexedDB `shape-26-12` e a compatibilidade com backups versao 1. Renomear a marca nao autoriza mudar a origem, limpar dados ou recriar o banco.
- Disponibilidade comercial do nome nao esta juridicamente certificada. Consulte `AUDITORIA.md`; nao apresentar triagem em buscadores como registro de marca ou disponibilidade de dominio.
- A base React/Vite ja existe, com fluxo diario, IndexedDB, graficos, importadores GPX/TCX e PWA. Consulte [README.md](../README.md) para capacidades reais, comandos e limitacoes; a arvore abaixo continua sendo uma referencia planejada para a evolucao.
- Implemente fluxos utilizaveis com persistencia e testes, nao apenas mockups. Priorize abrir o app, registrar comida, registrar treino e consultar indicadores e evolucao.
- Nao configurar hospedagem, dominio, caminho-base de producao, CI/CD, deploy ou App Store. Nao criar backend por padrao.
- Nao gerar historicos artificiais, botoes sem acao ou integracoes simuladas apresentadas como reais.

## Stack e fronteiras

- React, TypeScript e Vite; Tailwind CSS, Lucide React, Recharts e date-fns.
- Dexie.js sobre IndexedDB para dados estruturados. Zustand somente quando simplificar o estado; nao duplicar dados persistidos sem necessidade.
- PWA para operacao local offline. Preparar fronteira para Capacitor/iOS e HealthKit, sem alegar implementacao nativa antes de existir e ser testada.
- Dominio e calculos devem ser funcoes puras, tipadas e testaveis, independentes de React, IndexedDB, formatos externos e rede.
- A UI usa casos de uso/hooks; persistencia, parsers e adaptadores ficam em seus respectivos modulos. Nao calcular regras nutricionais ou energeticas dentro de componentes.
- Escolher dependencias adicionais apenas quando houver necessidade concreta. Os testes usam Vitest, React Testing Library e fake-indexeddb. Execute `npm run test` sem watch.

## Estrutura planejada

```text
.github/
  copilot-instructions.md
SYSTEM_PROMPT.md               # Especificacao completa do produto
README.md                      # Execucao local, recursos reais e limitacoes
package.json                   # Scripts e dependencias
index.html                     # Entrada do Vite
vite.config.ts                 # Build e configuracao PWA quando implementada
tsconfig*.json                 # Configuracao TypeScript
public/
  icons/                       # Assets e icones instalaveis da PWA
src/
  main.tsx                     # Entrada React
  app/                         # Composicao, navegacao, providers e estilos globais
  components/
    layout/                    # Sidebar, navegacao inferior e safe areas
    dashboard/                 # Indicadores e resumo diario
    nutrition/                 # Refeicoes, porcoes e consumo
    training/                  # Treinos, exercicios e series
    charts/                    # Visualizacoes com dados reais
    ui/                        # Controles acessiveis reutilizaveis
  pages/
    Home.tsx
    Nutrition.tsx
    Training.tsx
    Progress.tsx
    Integrations.tsx
    Settings.tsx               # Perfil, metas, privacidade e backup
  domain/
    energyBalance.ts           # Ingestao, TDEE, metas e saldo
    nutrition.ts               # Porcoes, macros e consumo parcial
    activities.ts              # Normalizacao e deduplicacao
  data/
    initialPlan.ts             # Perfil, metas, refeicoes e semana planejada
    foodCatalog.ts             # Nutrientes aproximados com fonte e unidade
  integrations/
    strava/                    # StravaAdapter, ActivityMapper e SyncService
    apple-health/              # HealthKitAdapter e fronteira nativa futura
    imports/                   # Parsers locais realmente suportados
  db/                          # Schema Dexie, migracoes, repositorios e backup
  hooks/                       # Ligacao entre UI, casos de uso e dados locais
  stores/                      # Estado compartilhado opcional, se necessario
  types/                       # Contratos compartilhados e unidades explicitas
  utils/                       # Datas, formatacao e utilitarios pequenos
```

- Criar diretorios e arquivos conforme a funcionalidade exigir; nao gerar placeholders ou camadas vazias apenas para reproduzir a arvore.
- Manter testes proximos do modulo testado (`*.test.ts` / `*.test.tsx`). Reutilizar helpers e configuracao de testes existentes.
- O controle de doces integra o fluxo de alimentacao e sua evolucao; nao exige uma pagina adicional por padrao.
- Detalhar formatos suportados e contratos OAuth/nativos na documentacao quando implementados.
- A implementacao atual agrupa contratos em `src/types/index.ts`, catalogo e plano em `src/data/initialPlan.ts`, formularios em `src/components/ui/Editors.tsx` e dados reativos em `src/hooks/useAppData.tsx`. Reutilize esses modulos antes de criar arquivos equivalentes da arvore sugerida.
- `src/integrations/imports/parser.worker.ts` processa GPX/TCX fora da thread da interface. FIT e Apple Health XML/ZIP ainda nao sao suportados; nao apresentar esses formatos como funcionais.
- O motor testa meta dinamica, mas a interface expoe somente meta fixa nesta primeira versao. Expor modo dinamico exige primeiro confirmar base sem exercicio e atividade incremental; nao derivar essa atividade indiscriminadamente de todas as calorias importadas.

## Dados iniciais e integridade

- Perfil inicial editavel: 27 anos, 174 cm, 67 kg; objetivo de hipertrofia, peso-alvo de referencia de 69 kg, periodo de 2026-11-03 a 2026-12-26.
- Meta fixa inicial de 2.800 kcal/dia; referencias de 140 g de proteina, 385 g de carboidratos e 78 g de gorduras (aproximadamente 2.802 kcal). Nao forcar igualdade artificial entre essas referencias.
- Pre-cadastrar as seis refeicoes, o plano semanal de atividades e os marcos exatamente conforme as secoes 6, 8 e 13 da especificacao. Inicializar planos e configuracoes de forma idempotente, sem criar consumos ou treinos realizados.
- Metas sao estimativas, nao prescricoes. Nao presumir sexo biologico nem tratar toda variacao de peso como massa muscular.
- Diferenciar planejado de consumido. Totais derivam dos ingredientes e porcoes efetivamente consumidos, nunca da soma duplicada dos valores ilustrativos das refeicoes.
- Alimentos vagos ou quantidades ausentes exigem escolha do usuario ou valor desconhecido; nao inventar precisao nutricional. Catalogo deve informar fonte, unidade e valores aproximados editaveis.
- Preservar snapshots do consumo ao alterar o plano futuro. Suportar consumo parcial, desfazer e navegacao por data.
- No controle de doces, apenas registros explicitos contam como dia sem doces ou com consumo. Dia sem registro e desconhecido; informar o denominador dos dias registrados nas porcentagens. Nao classificar frutas/leite como doces proibidos nem usar linguagem punitiva.
- Treinos manuais incluem modalidade, inicio, duracao, distancia quando aplicavel, frequencia cardiaca disponivel, energia informada, notas e fonte. Musculacao inclui exercicios, series, repeticoes, carga e progressao.
- Peso, medidas opcionais e marcos sao editaveis; preservar historico apos o fim da meta e permitir nova meta.

## Energia e atividades: regras criticas

- Centralizar o motor em `src/domain/energyBalance.ts`. Distinguir ingestao, energia ativa de exercicio, gasto de repouso, TDEE e meta alimentar, sempre com origem e metodologia.
- Saldo energetico = ingestao menos TDEE; nunca ingestao menos apenas exercicio. TDEE ausente significa saldo desconhecido, nao zero.
- Meta fixa e o padrao: nao adicionar automaticamente calorias de treino as 2.800 kcal.
- Meta dinamica exige opt-in, gasto-base sem exercicio e apenas atividade incremental apropriada, com limitacoes e confianca explicitas.
- Mifflin-St Jeor somente com todas as entradas necessarias; solicitar sexo biologico opcionalmente apenas se a formula escolhida o exigir.
- Nao misturar energia ativa, total e desconhecida. Nao somar treino ja incluido em outra fonte ou no TDEE. Nao recomendar automaticamente repor toda energia de um treino.
- Modelar atividades com ID local, IDs externos, fonte, esporte, inicio/fim, duracao, distancia, energia/tipo/unidade, frequencia cardiaca, status e metadados de importacao.
- Deduplicar por IDs externos e, quando necessario, horario, duracao e modalidade. Casos ambiguos exigem confirmacao; preservar rastreabilidade e permitir corrigir associacoes.
- Ausencia de calorias nao equivale a zero. Exibir "nao informado" sem metodologia e dados suficientes; privilegiar tendencias semanais em vez de certezas individuais.

## Integracoes honestas e seguras

- Strava exige OAuth 2.0 com troca/renovacao em servico seguro. Nunca incluir Client Secret ou tokens sensiveis no frontend, em `VITE_*` ou no repositorio.
- Sem infraestrutura configurada, oferecer apenas importacao local realmente implementada. "Conectada" e sincronizacao manual so podem aparecer quando funcionarem de verdade.
- Manter `StravaAdapter`, `ActivityMapper` e `SyncService` desacoplados; documentar contrato do servico OAuth futuro sem implementa-lo por padrao.
- PWA nao acessa HealthKit diretamente. Nao criar "Conectar Apple Watch" ficticio. `HealthKitAdapter` e a fronteira Capacitor devem deixar clara a dependencia de plugin nativo, permissoes e testes em dispositivo.
- Implementar apenas formatos viaveis e testados, como GPX/TCX/FIT ou Apple Health XML/ZIP; nao prometer suporte a todos. Informar campos ausentes, origem e periodo importado.
- Importadores precisam de validacao, erros compreensiveis, progresso e tratamento de arquivos grandes sem bloquear a interface. Mapear apenas campos presentes; respeitar permissoes e limites das fontes.

## Persistencia, datas e privacidade

- IndexedDB versionado com migracoes, validacao, inicializacao idempotente, edicao/exclusao e prevencao de duplicatas.
- Datas diarias em `YYYY-MM-DD` no fuso local; nao derivar o dia local indiscriminadamente por conversao UTC. Atividades preservam timestamps com timezone adequado.
- Backup JSON exige validacao de schema/versao e confirmacao antes de substituir dados; evitar importacoes parciais em caso de falha.
- Fotos sao opcionais; se implementadas, usar IndexedDB, compressao, limites e exclusao individual. Nunca armazenar imagens grandes no localStorage; explicitar exclusoes do backup e exportacao separada quando disponivel.
- Dados de saude locais por padrao. Sem telemetria, upload ou envio a terceiros implicito; exigir consentimento para transferencias.
- Avisar sobre armazenamento especifico do dispositivo/navegador e risco de perda ao limpar dados ou desinstalar. Offline deve cobrir os registros locais, nao prometer integracoes externas sem rede.

## Interface e acessibilidade

- Preservar a identidade fitness futurista premium definida na secao 3: fundo `#080D0B`, superficies `#111A16`, cards `#15211B`; destaques `#B6FF4D`, `#39FF88`, `#00C896`; texto `#F4F8F5` e `#92A69A`.
- Graficos reais com linhas verdes, gradientes e glow sutil, tipografia forte e animacoes discretas. Legibilidade, contraste e performance prevalecem sobre decoracao.
- Mobile-first: uma coluna, safe areas do iPhone e navegacao inferior Home, Alimentacao, Treinos, Evolucao e Perfil; desktop com sidebar e grid amplo. Integracoes acessiveis pelo Perfil/configuracoes.
- Garantir alvos de toque confortaveis, labels, foco visivel, teclado, feedback imediato, confirmacao de acoes destrutivas e nenhuma dependencia exclusiva de hover.
- Dashboard inclui progresso calorico, macros, refeicoes, peso, treinos, energia, prazo, painel Energy Balance, graficos 7/30 dias e acoes rapidas funcionais conforme secao 5.
- Estados vazios devem distinguir ausencia de historico de valor zero. Indicadores e graficos devem refletir registros, edicoes e exclusoes imediatamente.
- PWA requer manifest, icones, service worker e verificacao de instalacao/standalone quando disponivel. Nao definir estrategia de publicacao.

## Execucao e verificacao

- Ao inicializar o projeto, disponibilizar `npm run dev`, `npm run build`, `npm run preview`, `npm run typecheck` e `npm run test`; testes devem ter execucao unica apropriada para verificacao automatizada.
- Antes de alterar uma regra, identificar seu modulo e um teste focado. Validar o trecho alterado primeiro; nao adiar todos os testes para a etapa final.
- Cobrir macros por porcao/consumo parcial, marcar/desmarcar refeicoes e atualizacao de indicadores, metas fixa/dinamica, saldo sem TDEE, ausencia de dupla contagem, deduplicacao, datas locais, persistencia, migracoes, backup e parsers suportados.
- Verificar estados sem historico, controle explicito de doces e preservacao de snapshots. Testar fluxos visiveis no navegador, incluindo desktop/mobile, offline, persistencia apos recarregar e acessibilidade.
- Ao concluir uma entrega executavel, rodar typecheck, testes e build. Relatar resultados reais e verificacoes nao realizadas, com limitacoes concretas.
- Documentar comandos de instalacao/execucao local e separar recursos funcionais das dependencias futuras de OAuth seguro ou iOS nativo. Nao iniciar um segundo ambiente na porta de um ambiente existente.

## Sequencia de implementacao

1. Inicializar React + TypeScript + Vite na raiz, preservando a especificacao e estas instrucoes; configurar dependencias, scripts e base de testes.
2. Construir design system e layout responsivo com navegacao mobile/desktop e estados vazios.
3. Implementar tipos, IndexedDB, migracoes e planos iniciais idempotentes.
4. Entregar alimentacao com catalogo, checklist, consumo parcial e calculos testados.
5. Entregar treinos manuais e musculacao.
6. Implementar motor energetico puro e testado.
7. Conectar dashboard e graficos aos dados reais.
8. Entregar evolucao corporal e controle de doces.
9. Implementar importadores delimitados e interfaces de integracao.
10. Configurar PWA local e preparar a fronteira Capacitor/HealthKit.
11. Revisar fluxo diario completo, acessibilidade, offline, backup, testes, typecheck e build.
12. Atualizar documentacao com funcionalidades reais e limitacoes, sem deploy.