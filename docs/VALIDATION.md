# Validação do CareerOS

## v1.1 — Plano Individual de Carreira (14/10/2026)

O modelo é importado apenas após prévia e confirmação do usuário. O teste em `http://127.0.0.1:5174` usou uma origem isolada para não alterar os registros da aplicação já aberta em `:5173`. Na origem principal, registros antigos continuaram visíveis e a prévia apareceu com a criação pendente de confirmação.

- Importação com início em 31/01/2027 criou 1 plano, 5 caminhos, 6 etapas mensais, 6 entregas, 6 marcos, 13 ações e 10 recursos. O ciclo exibiu janeiro a junho de 2027; marco de 30 dias em 02/03/2027 e horizonte de 3 a 5 anos de janeiro de 2030 a janeiro de 2032.
- Uma ação concluída saiu da lista pendente; as entregas continuaram em 0 de 6 e o plano permaneceu Planejado.
- Uma sessão real de 45 minutos apareceu como 0,8 h na semana. A estimativa de capacidade permaneceu separada.
- Uma vaga fictícia marcada como origem Real ficou fora da contagem de analisadas enquanto Salva; ao mudar para Avaliando, o indicador passou de 0 para 1. Nenhuma candidatura foi criada.
- A tela recarregada preservou o plano e seus vínculos. Os dez recursos exibem aviso de que URLs, instrutores e inclusão em assinaturas ainda não foram confirmados.
- Os testes automatizados cobrem idempotência da importação, reaproveitamento de dados, deslocamento civil de datas, independência entre ação e competência, backup v2, leitura de backup v1, migração de banco v2→v3, remoção de plano e rollback transacional.
- Em viewport de 390 px, a página manteve cartões legíveis, navegação horizontal local e nenhuma rolagem horizontal global (`scrollWidth` 375 px). A captura móvel foi inspecionada visualmente.

Verificações finais: `pnpm typecheck` passou; `pnpm test` passou (20 testes em 2 arquivos); `pnpm build` passou (bundle JS 482,64 kB). O Rollup exibiu apenas avisos de comentários de pureza da dependência Zod.

Na validação inicial da v1.1, o workflow do GitHub Pages ainda não tinha sido executado. A publicação posterior é registrada abaixo.

## Publicação no GitHub Pages — 14/10/2026

O primeiro envio ao repositório foi publicado diretamente da raiz de `main`, deixando a página em branco: o HTML apontava para `/src/main.tsx`. A fonte do Pages foi alterada para GitHub Actions, e o workflow passou a rodar também em `push` para `main`, gerando e publicando `dist` com a base `/Carreira/`.

## MVP original — 13/10/2026

Data: 13/10/2026 (America/Sao_Paulo).

## Entregas

| Etapa | Entrega implementada | Verificação |
| --- | --- | --- |
| 1 | React/TS/Vite, navegação hash, Dexie, vagas e candidaturas separadas, eventos e contatos | Tipos, build, cadastro e recarga no navegador, testes de histórico |
| 2 | Ações vinculadas e visão geral com indicadores derivados e filtros | Ação criada pela oportunidade, indicador e vínculo visíveis |
| 3 | Perfil, formação, objetivos, caminhos, experiências/projetos, competências e fontes, requisitos | Competência, requisito parcial e evidência vinculada cadastrados no navegador; testes sem aumento automático de nível |
| 4 | Sessões de estudo e revisões periódicas | 45 minutos registrados no navegador; testes de fronteiras da semana e exclusão de estimativas |
| 5 | Backup completo versionado, validação, resumo e restauração atômica, exclusões e migrações | Exportação e restauração no navegador; testes de vínculos, arquivo inválido, migração e falha transacional |
| 6 | Layout responsivo, labels/foco/modal, estados vazios e de erro, README e workflow manual | Desktop e viewport de 390 px; types/build; workflow preparado, não executado |

## Comandos executados

- `pnpm typecheck` — passou.
- `pnpm test` — passou (12 testes na bateria final).
- `pnpm build` — passou. Bundle abaixo do limite de aviso de 500 kB do Vite. Houve avisos do Rollup sobre comentários de pureza no Zod; não impediram o build.

Os testes cobrem histórico preservado e etapa corrigida, uma candidatura por vaga, fontes sem aumento automático de nível, contabilização semanal, exportação/restauração, versões e vínculos inválidos sem mutação, cascatas/desvinculação, migração v1→v2 e rollback de uma falha simulada no meio da escrita.

## Fluxo no navegador

Na origem local http://127.0.0.1:5173, com registros fictícios identificados como teste:

1. Cadastro de vaga sem salário → exibido como “Salário não informado”.
2. Competência criada e requisito vinculado marcado Parcial com justificativa.
3. Ação vinculada à vaga e competência, com estimativa de 120 minutos.
4. Sessão de 45 minutos registrada; somente esses 45 minutos entraram no total semanal.
5. Evidência vinculada à competência e ação.
6. Candidatura atualizada para Entrevista; novo evento em Teste com data real retroativa 10/10/2026 preservou o anterior.
7. Página recarregada em `#jobs`: vaga, requisito, ação e histórico continuaram presentes.
8. Backup JSON baixado, selecionado para importação e aceito: resumo mostrou os vínculos e dois eventos. Confirmação concluiu a restauração.
9. Ação, competência, sessão e evidência conferidas depois da restauração.
10. Console sem erros no trecho integrado inspecionado.
11. Viewport 390 px: conteúdo sem overflow horizontal global; navegação horizontal local. Desktop com navegação lateral.
12. Prazo 16/10/2026 salvo e exibido após corrigir leitura de valores dos controles de data.
13. Competência salva com nível desejado vazio; fonte exibida como Não avaliado, sem nota agregada.
14. Atalho de ações pendentes abriu o Plano com filtro Pendentes selecionado.
15. Modal iniciou foco no primeiro campo; Escape fechou o formulário e devolveu foco ao botão de abertura.
16. Capturas finais revisadas em docs/screenshots/desktop.png e mobile.png.

Falhas encontradas e corrigidas: a ordem de eventos não podia depender de UUIDs; acrescentada sequência explícita. O driver de navegador alterou o valor visual de inputs de data sem sincronizar o estado React; o salvamento agora lê FormData dos controles. Seleções opcionais vazias são normalizadas para ausentes.

## Pendências reais

- Nome/criação do repositório, configuração do Pages e primeira publicação, aguardando solicitação.
- Execução real do workflow no GitHub e validação da origem publicada.
- Auditoria completa de acessibilidade com leitores de tela e matriz de dispositivos/navegadores não executadas.

Os dados de validação permanecem apenas no navegador de teste. A aplicação não os insere na base de um novo navegador.

