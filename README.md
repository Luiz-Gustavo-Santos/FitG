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

## Implementado nesta primeira versao

- Layout fitness verde-neon, sidebar desktop, navegacao inferior mobile, safe areas, controles de data e estados vazios.
- Perfil e metas editaveis, seis refeicoes planejadas e semana de treinos de referencia, sem registros historicos pre-fabricados.
- Catalogo nutricional aproximado e editavel, com fonte/base/unidade. Porcoes sem escolha ou quantidade permanecem desconhecidas.
- Consumo parcial por alimento, substituicoes, inclusao de alimentos do catalogo, criacao/edicao/exclusao de refeicoes planejadas e desfazer consumo.
- Consumos preservam snapshots; editar o plano ou catalogo nao reescreve historico. Novo registro da mesma refeicao/data substitui o anterior.
- Treinos manuais com inicio, modalidade, duracao, distancia, frequencia cardiaca, energia informada/tipo, notas e exercicios com series/repeticoes/carga; edicao/exclusao.
- Dashboard reativo, meta fixa sem reposicao automatica do treino e saldo apenas quando existe TDEE informado com origem. Energia desconhecida/total nao entra na soma de energia ativa.
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

| Formato | Campos importados | Ausencias/limites |
| --- | --- | --- |
| GPX | Nome, modalidade reconhecida, inicio com fuso, duracao decorrida dos horarios dos pontos | Requer track e pelo menos dois horarios ordenados; nao importa rotas sem horario, distancia, FC, energia ou extensoes |
| TCX | Modalidade, inicio com fuso, soma da duracao de voltas, distancia em km, calorias e FC media ponderada quando todas as voltas informam os campos | Calorias entram com tipo desconhecido; nao sao automaticamente energia ativa. Sem FIT, extensoes ou arquivos de cursos |

O ID de importacao e o SHA-256 do arquivo mais indice da atividade. Um arquivo diferente e analisado por proximidade de inicio (10 minutos), duracao (5 minutos ou 15%) e modalidade. Possiveis duplicatas ficam desmarcadas; marcar significa confirmar um treino distinto. Verifique a modalidade `Outro` apos importar.

## PWA e iPhone

O service worker fica desativado no `dev` para nao interferir em edicoes. Para verificar offline: gerar build, executar preview, abrir conectado, aguardar instalacao do service worker, recarregar e depois desligar a rede. Cache e IndexedDB sao independentes. Atualizacoes nao recarregam um formulario automaticamente; feche todas as abas e reabra para ativar uma versao nova.

A instalacao no iPhone requer Safari e contexto seguro compativel. `127.0.0.1` no computador nao e acessivel pelo iPhone; teste no aparelho exige acesso local seguro configurado separadamente. Esta entrega nao configura HTTPS, hospedagem ou publicacao. Layout mobile foi validado por viewport; HealthKit/instalacao em iPhone fisico ainda nao foram certificados.

Para regenerar os icones locais: `node scripts/generate-icons.mjs`.

## Privacidade e backup

Dados ficam neste dispositivo e nesta origem do navegador. Trocar porta/origem, usar outro navegador, limpar armazenamento ou desinstalar pode tornar os dados indisponiveis. Exporte backups regularmente. O JSON inclui dados de saude em texto legivel; guarde-o com cuidado. Restauracao substitui todos os dados e exige confirmacao. Limite de backup: 20 MB.

Nao ha fotos nesta versao; portanto o backup inclui todos os registros implementados. Nao armazenamos imagens no localStorage. Fontes e icones sao locais; nao ha CDN, analytics ou chamadas de API de saude.

## Proximas etapas e integracoes nao implementadas

- Expor meta dinamica somente com origem, base sem exercicio e confirmacao de atividade incremental para evitar dupla contagem.
- Edicao do plano semanal, catalogo com criacao de novos alimentos, medidas corporais, fotos opcionais, marcos editaveis e progressao/volume de cargas.
- Apple Health XML/ZIP e FIT ainda nao suportados. Nao existe acesso direto a Apple Watch/HealthKit pela PWA.
- Strava nao conectado: contratos de `StravaAdapter`, `ActivityMapper` e `SyncService` em `src/integrations/strava/contracts.ts`. Um futuro servico seguro deve fazer OAuth/token exchange/refresh, validar state, respeitar scopes/rate limits e guardar tokens fora do frontend. Usar sessao HttpOnly/Secure, protecao CSRF e consentimento; nunca secrets em `VITE_*`.
- Fronteira nativa `HealthKitAdapter` em `src/integrations/apple-health/contracts.ts`. Plugin Capacitor real, permissoes de leitura e testes em dispositivo iOS sao futuros; nao ha projeto Xcode/plugin implementado.
- Associacoes de duplicatas ainda nao sao mescladas entre fontes; nesta versao a revisao permite ignorar a entrada ou confirmar que e outra atividade.

## Verificacao e dependencias

Testes cobrem dominio energetico, porcoes/snapshots, datas invalidas, doces, IndexedDB/backup, GPX/TCX e fluxo da interface. Revisar tambem formulacao de dados desconhecidos e os controles no navegador ao mudar regras.

A auditoria inicial encontrou vulnerabilidades no executor de testes; o Vitest foi atualizado para elimina-las. Restaram avisos baixos/moderados em dependencias transitivas da toolchain PWA apos `npm audit fix`; `npm audit --omit=dev` nao apontou vulnerabilidades de runtime na verificacao desta entrega. Reavaliar a auditoria ao atualizar dependencias.

Escopo completo: [SYSTEM_PROMPT.md](SYSTEM_PROMPT.md). Convencoes: [.github/copilot-instructions.md](.github/copilot-instructions.md).