# Argila — Gestão de Ateliê

Esta pasta contém a versão HTML original do Argila, preparada para hospedagem estática. Ela não requer instalação nem etapa de build: `index.html` é o site.

## Publicar uma demonstração

1. Faça uma cópia de segurança dos dados existentes no app aberto no navegador antigo: Configurações → Exportar dados. Guarde o JSON fora desta pasta.
2. Publique a pasta `argila-app` em um host de sites estáticos. Para a publicação manual no Netlify, arraste esta pasta para [Netlify Drop](https://app.netlify.com/drop), conforme o [guia oficial](https://docs.netlify.com/start/quickstarts/netlify-drop-quickstart/).
3. Abra o endereço HTTPS gerado e confira o app em computador e celular.
4. Para atualizar o site, publique novamente a pasta `argila-app`.

O arquivo não faz upload dos dados dos visitantes. Cada navegador guarda sua própria base no `localStorage`. Os dados do arquivo aberto como `file://` também não passam automaticamente para o novo endereço HTTPS: exporte um backup no app antigo e importe-o no novo endereço. Um backup feito em um navegador não inclui os dados de outros navegadores ou dispositivos.

Esta versão é adequada para demonstração individual. Ela não oferece contas, sincronização entre dispositivos, colaboração em tempo real nem banco compartilhado. Não use esta publicação como serviço multiusuário nem guarde nela dados sensíveis de clientes.

## Estrutura dos dados locais

O backup exportado é um objeto JSON com arrays para `produtos`, `vendas`, `clientes`, `materiais`, `producao` e `transacoes`, além de `config`. Conforme o uso, inclui também mapas `estoque_argilas` e `estoque_esmaltes`. Consulte [PUBLICACAO_E_MIGRACAO.md](PUBLICACAO_E_MIGRACAO.md) para o inventário e o roteiro de migração para contas e banco compartilhado.

## Arquivos

- `index.html`: aplicação Argila publicada.
- `PUBLICACAO_E_MIGRACAO.md`: limites da publicação atual, inventário e desenho inicial da migração.
