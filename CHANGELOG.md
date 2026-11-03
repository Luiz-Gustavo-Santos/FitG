# Changelog

Versoes do aplicativo seguem SemVer. IndexedDB e backup possuem versoes independentes.

## Em desenvolvimento

- Auditoria mobile: corrigida a falha ao criar refeicoes via HTTP na rede local. UUID v4 com `crypto.getRandomValues` substitui `crypto.randomUUID` em alimentos/consumos, ingredientes, treinos, peso e parsers, preservando IDs existentes, banco e backups.
- Importacao GPX/TCX usa SHA-256 local com `@noble/hashes`, sem dependencia de `crypto.subtle`/HTTPS e sem alterar fingerprints ou deduplicacao. Menu de refeicoes corrigido para nao herdar a largura de 44 px do botao, ficar sob cards vizinhos ou ser coberto pelo aviso de sucesso.
- Verificacao mobile: 56 testes, typecheck, build e auditoria de runtime aprovados. Fluxos reais de alimentacao, treino, peso, perfil/catalogo, doces, backup e importacao conferidos em HTTP LAN; telas em 320/390/430 px e menus por toque. Preview com recarga, persistencia e GPX offline aprovado em Chromium mobile. Evidencias e limites em [AUDITORIA.md](AUDITORIA.md); Safari/iPhone fisico e instalacao no aparelho ainda nao homologados.
- Sprint 10.1: Alimentacao mais densa, resumo desktop de 282 px com anel de 144 px e macros em faixa compacta. Eliminado o resumo lateral repetido; criacao de refeicoes junto ao titulo e doces em secao secundaria, sem remover acoes.
- Refeicoes horizontais de 100 px no desktop, com nome, horario, calorias/macros conhecidos ou desconhecidos, status e acoes. Area livre do card abre detalhes pelo botao existente. Modal de detalhes posicionado lateralmente no desktop, mantendo a folha inferior mobile e a logica existente.
- Playwright MCP em 1366x768 confirmou duas refeicoes inteiras antes da primeira rolagem; 390x844 com resumo reduzido e primeira refeicao acima da acao flutuante. Fluxos de registro parcial, persistencia, desfazer, criacao e detalhes verificados sem erros JavaScript. Banco, calculos, regras e dependencias nao foram alterados.
- Sprint 10: Alimentacao recomposta com cabecalho compacto, dias da semana, anel calorico dominante, macros com cores distintas e cards de refeicoes sem accordions. Detalhes em painel; coluna contextual no desktop e acao central de novo registro no mobile.
- Editor com nome sempre editavel, quatro indicadores nutricionais, ingredientes/quantidades/unidades, inclusao e remocao; folha inferior mobile e modal amplo desktop com rodape de salvar visivel. Cards sem foto real usam icone neutro, sem dados ou imagens ficticios.
- Edicao de consumos salvos e avulsos preserva o snapshot original ao redimensionar porcoes, sem alterar o plano nem reaplicar silenciosamente nutrientes do catalogo atualizado. Desfazer, historico de planos excluidos e backup versao 1 permanecem compativeis.
- Verificacao da Sprint 10: 51 testes, typecheck e build aprovados; Playwright MCP em 320, 430 e 1440 px. Consumo parcial, inclusao/remocao de ingredientes, edicao, persistencia apos recarregar, registro avulso e desfazer conferidos em contexto isolado, sem alterar a base do usuario. Rodape, quantidades, foco e ausencia de sobreposicao do aviso sobre a acao central verificados. Nao certifica iPhone fisico, teclado virtual ou offline em dispositivo.
- Verificacao da Sprint 09: 47 testes, typecheck e build aprovados. Home em 320, 430 e 1440 px, fotografias locais, navegacao dos cards e perfil por teclado conferidos no Playwright MCP. Alimentacao parcial, treino, pesagens e persistencia verificados em sessao isolada. Nao certifica iPhone fisico ou operacao offline em dispositivo.
- Sprint 09: Home de consulta diaria com tema Laranja Energia, faixa de indicadores circulares e cards fotograficos de Nutricao, Performance e Evolucao. Cards encaminham aos menus existentes para preenchimento, sem formularios ou ingredientes na Home.
- Indicadores usam dados reais: ausencia de consumo permanece desconhecida, consistencia mostra dias com alimentacao ou treino em sete dias, peso aparece somente com pesagem e minigrafico exige historico real. Perfil acessivel pelo cabecalho mobile; sidebar e navegacao inferior preservadas.
- Fotografias WebP servidas localmente e incluidas no precache, com origem/licenca documentadas. Nenhum elemento ou imagem da Oura utilizado; demais telas mantem seu visual anterior.
- Registro de refeicao simplificado para selecao e quantidades; personalizacao completa sob demanda preserva o rascunho. Folha inferior no mobile, data do consumo explicita e ciclo de foco por Tab/Shift+Tab.
- Quantidade temporariamente invalida durante a digitacao nao interrompe a revisao nem e enviada ao calculo; salvar fica bloqueado ate a correcao. Porcoes desmarcadas ficam desabilitadas e nao impedem registrar os demais alimentos.
- Menu contextual para editar/excluir planos, com teclado, Escape, retorno de foco, fechamento fora do menu e confirmacao de exclusao.
- Data compacta sem icone de calendario duplicado e retorno a hoje por controle acessivel, inclusive em 320 px. Campos de formulario com fonte de 16 px e botoes de modal com alvos de pelo menos 44 px.
- Estado vazio explicito, progresso somente com consumo conhecido e consultas secundarias agrupadas em Resumo e historico; nutrientes ausentes nao viram zero.
- Detalhes de treinos, plano semanal, graficos, doces, perfil, catalogo, backup e integracoes recolhidos por padrao.
- Maior contraste de textos secundarios, alvos de toque ampliados e cabecalho sem menu mobile duplicado.
- Rascunho do perfil preservado ao recolher; validacao nativa de idade inteira corrigida.
- Navegacao por data reinicia os detalhes fechados sem alterar registros. Banco e backup permanecem no schema 1; nenhuma migracao ou limpeza de dados.
- Verificacao local: 45 testes, typecheck e build aprovados. Playwright MCP conferiu as cinco telas em 320, 430 e 1440 px, inicialmente fechadas e com detalhes expandidos, sem controles fora das bordas. Registro parcial de 388,8 kcal persistiu apos recarregar, sem alterar o plano, e foi desfeito em sessao isolada. Menu por teclado/Escape, retorno de foco, ciclo Tab/Shift+Tab e digitacao caractere a caractere de fracao conferidos no navegador. Nao substitui teste desta interface em iPhone fisico nem homologacao offline da PWA.

## 0.2.0 - 2026-11-03

### Corrigido

- Consumos exibidos a partir do snapshot, inclusive apos excluir ou alterar o plano.
- Ingestao e saldo desconhecidos quando nao existem nutrientes conhecidos; graficos identificam valores parciais.
- Revisao de duplicatas dentro do lote e revalidacao de conflitos na transacao de importacao.
- Rejeicao de timestamps com datas impossiveis antes da normalizacao.
- Edicao de treinos preserva precisao, timestamp original e origem.
- Restauracao de backup dinamico exige confirmacao de conversao para meta fixa; perfil dinamico possui recuperacao explicita.
- Datas da interface acompanham a meta editavel.

### Adicionado

- Aviso de atualizacao da PWA com confirmacao, protecao de formularios/dialogos e tratamento de erro.
- Versao do aplicativo visivel no rodape, derivada do pacote.
- Testes de regressao para historico, completude, lotes, datas, precisao, restauracao atomica e atualizacao.

### Compatibilidade

- Banco IndexedDB continua `shape-26-12`, schema 1; backup continua versao 1.
- Nenhuma migracao estrutural ou limpeza de registros e necessaria nesta versao.
- Reverter o codigo nao reverte dados automaticamente. Exporte backup antes de restaurar dados ou realizar futuras migracoes.
- Clientes 0.1.0 ainda nao possuem aviso de atualizacao: fechar todas as abas do app e reabrir pode ser necessario para receber a primeira versao com esse aviso. Nao limpe dados do navegador.
- Atualizacao em abas diferentes e instalacao em iPhone fisico continuam exigindo verificacao adicional. Nao ha certificacao de producao/comercializacao.
- Verificacoes: 33 testes, typecheck, build e auditoria de runtime aprovados; atualizacao entre dois builds com formulario protegido e consumo preservado verificada no preview. O teste offline desta sprint ficou inconclusivo porque a ferramenta integrada alterou a conexao durante os reloads; precisa de confirmacao independente.

## 0.1.0 - 2026-11-03

- Baseline inicial no Git: `cd78469`.
- Fluxos locais de alimentacao, treinos, peso, doces, backup, GPX/TCX e PWA.
- Limitacoes e evidencias iniciais documentadas em [AUDITORIA.md](AUDITORIA.md).
