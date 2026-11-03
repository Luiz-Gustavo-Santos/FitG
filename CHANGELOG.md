# Changelog

Versoes do aplicativo seguem SemVer. IndexedDB e backup possuem versoes independentes.

## Em desenvolvimento

- Home simplificada em lista de uso diario, sem hero promocional ou grade de indicadores.
- Refeicoes recolhidas na Home e em Alimentacao; alimentos, porcoes e acoes aparecem ao abrir.
- Detalhes de treinos, plano semanal, graficos, doces, perfil, catalogo, backup e integracoes recolhidos por padrao.
- Maior contraste de textos secundarios, alvos de toque ampliados e cabecalho sem menu mobile duplicado.
- Rascunho do perfil preservado ao recolher; validacao nativa de idade inteira corrigida.
- Navegacao por data reinicia os detalhes fechados sem alterar registros. Banco e backup permanecem no schema 1; nenhuma migracao ou limpeza de dados.
- Verificacao local: 38 testes, typecheck e build aprovados. As cinco telas foram verificadas em 320, 390 e 1440 px, inicialmente fechadas; os detalhes abertos tambem couberam em 320 px. Abertura por Enter/Espaco conferida no navegador. Nao substitui teste desta interface em iPhone fisico nem homologacao offline da PWA.

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