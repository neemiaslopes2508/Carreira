# CareerOS

Aplicação pessoal de planejamento de carreira, feita em React, TypeScript e Vite. Os registros ficam no IndexedDB do navegador; não há servidor de dados, login nem sincronização entre dispositivos.

## Site publicado

[Abrir CareerOS no GitHub Pages](https://neemiaslopes2508.github.io/Carreira/)

O GitHub Pages usa **GitHub Actions** como fonte. O workflow `.github/workflows/pages.yml` instala as dependências, verifica os tipos, executa os testes, gera o build do Vite com base `/Carreira/` e publica a pasta `dist`. Ele roda automaticamente a cada envio para `main` e também pode ser acionado manualmente na aba **Actions**.

Para atualizar o site, altere o código, teste e envie um commit para `main`. Aguarde o workflow **Publicar CareerOS no GitHub Pages** ficar verde. Enviar somente o código-fonte sem esse build produz uma página em branco, porque o navegador não executa diretamente `src/main.tsx`.

## Uso local

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

Abra `http://127.0.0.1:5173/` enquanto o terminal estiver executando o Vite. O endereço local deixa de funcionar quando o servidor para; isso não afeta o site no GitHub Pages.

```powershell
pnpm typecheck
pnpm test
pnpm build
```

## Dados e plano

Na página inicial, revise a prévia e escolha a data de início antes de criar o plano. A importação é explícita, transacional e evita duplicações. O modelo propõe cinco caminhos, seis meses de estudos, entregas, marcos, ações e recursos. Nenhum item é marcado como realizado automaticamente.

Exporte backups JSON regularmente em **Configurações**. Os dados do site publicado e os do endereço local são bases distintas, porque o IndexedDB pertence à origem do navegador. O backup contém informações pessoais em texto sem criptografia; guarde-o em local privado. Os links de cursos foram fornecidos pelo usuário e ainda não tiveram autoria, conteúdo, disponibilidade ou inclusão em assinaturas verificados.

Consulte [a validação](docs/VALIDATION.md) para os testes e limites verificados.

