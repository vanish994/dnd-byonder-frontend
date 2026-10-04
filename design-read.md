# Marco 9.1 — Design Read

## Mode

Redesign · Overhaul visual, preservando o comportamento e os contratos da aplicação jogável.

## Design Read

- **Artefato:** tela principal jogável de RPG solo.
- **Público:** jogador iniciante em celular, com suporte a tablet e desktop.
- **Linguagem:** grimório medieval, fortaleza de pedra, metal envelhecido e magia dracônica discreta.
- **Variância:** 7/10 — composição art-directed com grade estável.
- **Motion:** 4/10 — microinterações de estado e narrativa.
- **Densidade:** 6/10 — personagem, aventura, ações e resultados sem cockpit excessivo.
- **Assets:** 3/10 — tipografia, textura e ornamentos próprios; sem copiar identidade de terceiros.
- **Fidelidade:** 6/10 — wordmark temporário preservado, com identidade visual própria.

## Protected contracts

- `POST /v1/game/turn` e cliente do Gateway.
- `player_input` continua texto livre.
- O frontend sempre envia `action: null` neste v0.
- Nenhuma regra mecânica ou rolagem é calculada no frontend.
- `rule-resolution-v1`, `state` e `available_actions` são apenas apresentados.
- Backend, Gateway, Gemini e serviço MiMo permanecem intocados.

## System

- **Paleta:** carvão, grafite, marrom escuro, bronze, dourado envelhecido, âmbar e vermelho profundo.
- **Tipografia:** Cinzel para títulos, Libre Baskerville para narrativa e DM Sans para interface.
- **Espaçamento:** escala base 4/8 px.
- **Raio:** mínimo e funcional, remetendo a placas de metal e molduras de pedra.
- **Sombras:** elevação baixa/média, com brilho âmbar controlado.
- **Motion:** entrada curta, feedback de carregamento, hover/focus e `prefers-reduced-motion`.

## Preserve / Improve / Remove

- **Preserve:** fluxo de sessão, histórico, loading, erros e cliente API.
- **Improve:** personagem, cena, ações, resultados, mobile-first e contraste.
- **Remove:** aparência de chatbot genérico e decoração sem função.
