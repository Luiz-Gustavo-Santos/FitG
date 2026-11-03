# Changelog

Versoes do aplicativo seguem SemVer. IndexedDB e backup possuem versoes independentes.

## Em desenvolvimento

- Home simplificada em lista de uso diario, sem hero promocional ou grade de indicadores.
- Refeicoes recolhidas na Home e em Alimentacao; alimentos, porcoes e acoes aparecem ao abrir.
- Uma refeicao aberta por vez, com navegacao por setas/Home/End e possibilidade de recolher todas. Desktop amplo mostra lista e detalhe lado a lado, sem cabecalho de marca duplicado.
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