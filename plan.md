# Marco 6 — plano de implementação

## Design Read

- **Artefato:** SPA/PWA mobile-first para uma sessão real de D&D Solo.
- **Público:** jogador iniciante em celular, com foco em uma ação por turno.
- **Linguagem visual:** grim-fantasy editorial — crônica de mesa, papel escuro, cobre envelhecido e azul-noite.
- **Modo:** greenfield.
- **Variação visual:** 5/10.
- **Intensidade de movimento:** 3/10.
- **Densidade de informação:** 5/10.
- **Dependência de assets:** 1/10; nenhum asset oficial foi fornecido, portanto será usado somente wordmark tipográfico temporário.
- **Fidelidade de marca:** 4/10; `D&D BYONDER` será explicitamente um wordmark temporário, não um logo oficial.

## Design Decisions

- **Movimento:** grim-fantasy editorial, como um diário de campanha contemporâneo e legível.
- **Princípios:** narrativa em primeiro plano; dados técnicos separados; ações claras no polegar; estados de rede honestos.
- **Paleta:** azul-noite `#10151d`; carvão `#171e28`; papel `#eee8dc`; cobre `#c78d55`; verde-musgo apenas para sucesso mecânico real.
- **Tipografia:** Georgia/serif de sistema para narrativa e títulos; sans de sistema para interface e metadados.
- **Espaçamento:** escala de 4px, com módulos em 8/12/16/24/32px.
- **Raios:** 18px em cartões principais, 10px em controles; bordas finas em vez de sombras pesadas.
- **Movimento:** entrada suave de mensagens, spinner de baixa distração e nenhuma animação que esconda estado ou altere mecânica.
- **Layout:** coluna de leitura com painel lateral de estado em telas largas; composer no fim da sessão em mobile.
- **Interação:** uma ação narrativa é enviada como texto livre; nenhuma heurística ou ação mecânica é criada pelo cliente.

## Arquitetura

```text
src/
  api/game.ts              cliente do contrato POST /v1/game/turn
  components/              header, narrativa, input, resolução e estados
  pages/Game.tsx           composição da tela jogável
  state/useGameSession.ts  estado stateless da sessão no cliente
  types/game.ts            tipos espelhados do contrato real
  App.tsx                  shell da aplicação
```

## Limites

- O frontend não envia API keys.
- `player_input` permanece texto livre.
- `action` é sempre `null` nesta v0.1; a UI só renderiza `rule_resolution` se o backend devolver uma resolução.
- O estado retornado pelo backend substitui o estado atual da sessão sem ser recalculado.
- O histórico é de apresentação e não altera o estado mecânico.
