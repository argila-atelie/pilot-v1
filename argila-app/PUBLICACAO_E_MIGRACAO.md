# Publicação e migração do Argila

## Estado da versão preparada

`index.html` é o arquivo indicado pelo usuário (`argila-v5-funcional.html`), copiado para esta pasta para facilitar a publicação. É um app de página única, sem etapa de compilação e sem servidor. Usa JavaScript embutido, Google Fonts e Chart.js por CDN. Se as fontes ou o Chart.js não carregarem, o app pode perder recursos visuais; a publicação precisa de conexão para esses recursos externos.

Os registros são lidos e gravados integralmente em `localStorage` na chave `argila_db`. A preferência de recolher a barra lateral é salva separadamente. Não há login, sincronização ou escrita em servidor.

### Antes de publicar

- Exporte o JSON de cada navegador/dispositivo que já tenha dados. O `file://` e o domínio HTTPS são origens diferentes, então a base existente não será transferida automaticamente.
- Publique apenas para demonstração individual. Qualquer pessoa pode carregar o HTML, mas cada navegador terá sua própria base. O endereço público não torna os registros compartilhados.
- Evite inserir dados pessoais ou financeiros reais de clientes na demonstração pública. O host recebe apenas os arquivos estáticos, mas dados permanecem no dispositivo e não têm controle de acesso, backup central ou recuperação de conta.
- Guarde os backups fora do diretório publicado e não inclua JSON de usuários no repositório.

## Inventário do backup atual

O exportador serializa o objeto `db` inteiro como JSON. A raiz conhecida tem:

| Chave | Conteúdo observado | Relações e cuidados |
| --- | --- | --- |
| `produtos` | Catálogo, preço, custo, categoria, tipo, estoque, composição, queimas, insumos e opções de personalização | `id` é referenciado por vendas e produção. Preservar o saldo inicial durante a importação. |
| `vendas` | Vendas e pedidos; datas, cliente/produto, quantidades, valores, pagamento/status, especificações, entrega e observações | `cliente_id` e `produto_id` são opcionais. Nomes também são copiados para o pedido e devem ser preservados como fotografia histórica. |
| `clientes` | Nome e telefone, podendo conter outros campos legados | A referência de venda é `cliente_id`; não presumir que todo pedido tem cliente cadastrado. |
| `materiais` | Nome, tipo, unidade, quantidades comprada/usada/atual e estoque mínimo/custo | Quantidade atual pode ser calculada a partir de compras e uso, mas manter o valor importado para conferência. |
| `producao` | Produto, cliente opcional, quantidade, etapa, observações, custo estimado e data | `etapa` é índice numérico de 0 a 5. Confirmar os rótulos e a semântica de cada estado antes de criar enum definitivo. |
| `transacoes` | Receitas e despesas, descrição, categoria, valor e data | Vendas também criam uma receita. Não recriar receitas de venda na importação se importar `transacoes`, para evitar duplicidade. |
| `config` | Preferências e parâmetros de preço/finanças do ateliê | É por ateliê, não deve ser um único valor global para todos os usuários. |
| `estoque_argilas`, `estoque_esmaltes` | Mapas opcionais indexados pelo ID do catálogo correspondente | Podem não existir em backups antigos; migrar como 0/default quando ausentes sem descartar chaves desconhecidas. |

Os IDs são gerados pelo app, mas backups antigos e versões diferentes podem ter campos ausentes ou opcionais. Uma migração deve preservar IDs de origem, datas e valores originais e também manter uma cópia bruta do JSON importado para auditoria e reprocessamento. Exportações contêm dados pessoais de clientes e devem ser tratadas como dados privados.

## Modelo de destino recomendado

Usar Supabase Auth + PostgreSQL. Criar um `studio` (ateliê) como unidade de propriedade e uma tabela `studio_members` para permitir que várias contas trabalhem no mesmo ateliê. Não assumir que um usuário equivale a um ateliê: uma conta pode participar de mais de um e um ateliê pode ter várias pessoas.

Tabelas iniciais:

| Tabela | Campos/decisões centrais |
| --- | --- |
| `studios` | `id`, nome e timestamps; configurações gerais em `studio_settings`. |
| `studio_members` | `studio_id`, `user_id`, papel, criado em; chave única `(studio_id, user_id)`. |
| `studio_settings` | Uma linha por ateliê com moeda, margens, custos/hora, energia, taxas e demais parâmetros de `config`. |
| `products` | `id`, `studio_id`, dados do produto e campos estruturados de composição/custos; índices únicos por ID importado dentro do ateliê. |
| `customers` | `id`, `studio_id`, dados de contato necessários; limitar os dados pessoais coletados. |
| `sales` | `id`, `studio_id`, referências opcionais a produto/cliente, campos de pedido, valores como `numeric`, datas e status; preservar nomes e especificações históricos. |
| `materials` | `id`, `studio_id`, nome/tipo/unidade e limites. Separar saldo inicial de movimentações futuras. |
| `inventory_movements` | Ateliê/material, quantidade assinada, motivo, data, usuário e referência opcional à produção; fonte de verdade para o saldo auditável. |
| `production_items` | `id`, `studio_id`, referências opcionais, quantidade, etapa/status, datas e observações. |
| `financial_transactions` | `id`, `studio_id`, tipo, categoria, descrição, valor, data e vínculo opcional à venda. |
| `legacy_imports` | Ateliê, usuário que importou, data, versão do formato, resumo/erros e JSON original restrito. Guardar o original somente se houver política de retenção e acesso definida. |

Todas as tabelas do app devem ter `studio_id`, salvo tabelas de associação ou catálogo global explicitamente público. Ativar Row Level Security e criar políticas que verifiquem associação do usuário ao mesmo `studio_id` em cada operação. O segredo `service_role` fica somente no servidor; no navegador usa-se a chave publicável/anon com RLS. Não confiar em `studio_id` enviado pelo cliente sem validar a associação.

## Sequência segura de migração

1. Congelar e versionar o formato de backup; registrar `schema_version` e validar estrutura e limites de tamanho/quantidade. A exportação atual não inclui versão, então o importador novo deve reconhecer a forma legada e não alterar o arquivo original.
2. Criar conta, ateliê e associação do proprietário. Oferecer ao usuário a escolha entre criar um ateliê novo e importar para um ateliê existente.
3. Importar em uma operação idempotente, primeiro configurações, produtos/clientes/materiais, depois vendas, produção e transações. Mapear IDs antigos para IDs novos caso seja necessário gerar UUIDs; resolver relações somente após carregar os registros referenciados.
4. Preservar saldos iniciais de estoque e registrar um movimento de abertura. Não tentar inferir movimentos históricos que o backup não contém. Evitar duplicar receitas geradas por vendas.
5. Validar contagens por coleção, somas financeiras por período, saldos, vínculos e amostras de pedidos antes de marcar a importação como concluída. Erros devem apontar o registro e permitir reprocessar sem duplicar linhas.
6. Migrar imagens só se forem encontradas em backups reais. O formato examinado não demonstra campos de upload de imagem; armazenar referências textuais de pedido separadas de arquivos. Se forem adicionadas fotos, usar Supabase Storage com políticas por ateliê e metadados no banco.
7. Manter exportação e restauração do usuário em JSON como portabilidade. Documentar exclusão da conta/ateliê, retenção e recuperação de backup antes de lançar para dados reais.

## Critérios mínimos para liberar multiusuário

- Autenticação, recuperação de conta e associação a ateliês concluídas.
- RLS revisada para leitura/escrita de cada tabela e arquivos, com testes permitindo acesso do membro e negando acesso de pessoa de outro ateliê.
- Importação validada com backups de versões reais e com dados vazios, opcionais e inconsistentes.
- Operações de estoque e transações sem duplicidade após repetição ou concorrência.
- HTTPS, variáveis secretas fora do frontend, backups do banco, política de privacidade e fluxo de suporte/recuperação definidos.
- Testes do fluxo em celular, navegador privado, múltiplos usuários do mesmo ateliê e usuários de ateliês diferentes.

Este documento é um mapa inicial baseado no código e no formato visível da versão HTML, não uma migração implementada nem um esquema SQL final. Antes de fechar o banco, comparar backups reais de diferentes usuários/versões para descobrir propriedades opcionais e formatos legados adicionais.

## Primeira integração no workspace Next.js

O workspace agora preserva o JSON legado em `public/argila/index.html` e sincroniza o objeto completo em `public.argila_workspace_data`, uma linha privada por conta, usando a migração `supabase/migrations/202610140001_argila_workspace.sql`. Isso permite autenticação e sincronização entre dispositivos sem reescrever as rotinas do HTML nesta etapa. Os quadros normalizados listados acima continuam sendo a evolução recomendada para auditoria detalhada de estoque/financeiro e colaboração entre várias contas do mesmo ateliê; não são criados pela migração inicial.

Na integração Next.js, a importação de um backup antigo é feita explicitamente na tela de Configurações. Uma conta nova começa vazia para impedir que dados locais de outra conta no mesmo navegador sejam enviados à nuvem. O logout remove o cache local do navegador; os dados da conta continuam no Supabase.
