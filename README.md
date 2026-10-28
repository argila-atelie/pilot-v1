# Argila — Gestão de Ateliê

Este workspace agora abre o Argila na rota `/`. O app original estático foi preservado em `argila-app/`; a aplicação Next.js usa o mesmo HTML como interface e sincroniza o JSON do ateliê com Supabase.

## Preparar o ambiente

1. Copie `.env.example` para `.env.local` e informe `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` do projeto Supabase (projetos antigos podem usar `NEXT_PUBLIC_SUPABASE_ANON_KEY`; o app aceita os dois nomes). A chave pública/anon pode estar no navegador; nunca coloque a `service_role` em uma variável `NEXT_PUBLIC_*`.
2. No Supabase SQL Editor, aplique [`supabase/migrations/202610140001_argila_workspace.sql`](supabase/migrations/202610140001_argila_workspace.sql).
3. Configure em Supabase Auth os URLs de redirecionamento locais e de produção.
4. Execute `npm run dev` e crie uma conta pela tela de login.
5. Para importar dados antigos, abra Configurações → Importar dados no Argila e escolha o backup JSON exportado do HTML local/estático.

Para publicar, conecte este repositório a um host compatível com Next.js e cadastre as mesmas variáveis de ambiente no ambiente de produção. O host precisa executar o servidor Next.js; a pasta `public/argila` isolada não fornece autenticação nem persistência na nuvem.

## Publicar para uso pessoal

O app aceita cadastro aberto por padrão. Cada conta enxerga somente os próprios dados (RLS), mas qualquer pessoa com a URL poderia criar uma conta e usar a cota do seu projeto Supabase. Depois de publicar:

1. Em Supabase → Authentication → URL Configuration, informe o domínio publicado em **Site URL** e em **Redirect URLs**.
2. Crie a sua conta pela tela de login e importe o backup, se houver.
3. Em Supabase → Authentication → Sign In / Providers, desative **Allow new users to sign up**. Esse é o bloqueio efetivo: a API passa a recusar novos cadastros.
4. No host, defina `NEXT_PUBLIC_ALLOW_SIGNUP=false` e publique novamente para esconder a opção de cadastro na tela de login.

Para liberar um novo cadastro no futuro, reative a opção no Supabase (e a variável, se quiser o botão de volta) ou convide o usuário em Authentication → Users.

### Backups

O plano gratuito do Supabase não oferece backup para download. Exporte os dados em Configurações → Exportar Dados e guarde o JSON fora do navegador. O app registra a data da última exportação e mostra um lembrete no dashboard quando ela passa de 30 dias.

## Persistência atual

Cada usuário autenticado recebe uma linha própria em `argila_workspace_data`, protegida por RLS. O payload JSON mantém o formato de backup legado para reduzir o risco da primeira migração. Gravações usam revisão otimista para detectar conflitos entre sessões. A primeira versão oferece um espaço individual por conta; colaboração de várias contas no mesmo ateliê exige a próxima etapa de associação `studio_members` e políticas RLS por ateliê.

O JSON completo fica no navegador para manter o backup local e permitir exportação, e é sincronizado para o Supabase. Para trocar de usuário num dispositivo compartilhado, a base local é limpa quando a conta não tem dados na nuvem. Isso evita copiar acidentalmente os dados de uma conta para outra.

## Migração dos dados

Consulte [`argila-app/PUBLICACAO_E_MIGRACAO.md`](argila-app/PUBLICACAO_E_MIGRACAO.md) para o inventário legado, plano de normalização e cuidados com dados pessoais. O arquivo SQL desta versão cria somente o armazenamento inicial JSONB; ele não cria ainda as tabelas normalizadas desse plano.
