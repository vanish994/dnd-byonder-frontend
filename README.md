# D&D Byonder Solo — Frontend

Frontend React + TypeScript + Vite para uma primeira sessão jogável de D&D Solo. A interface é mobile-first, instalável como PWA e se comunica somente com o Gateway público:

```text
POST ${VITE_GAME_API_URL}/v1/game/turn
```

## Desenvolvimento

Crie um `.env.local` a partir do exemplo:

```bash
cp .env.example .env.local
npm install
npm run dev
```

Defina `VITE_GAME_API_URL` com a URL pública do Gateway. Se a variável não existir, o cliente usa `https://dnd-byonder-gateway.onrender.com` como fallback público. O navegador não recebe `RULE_ENGINE_API_KEY`, `MIMO_API_KEY` ou qualquer credencial privada. A autenticação do Rule Engine é resolvida exclusivamente no Gateway; esta v0.1 envia somente o contrato público do turno.

## Comandos

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Contrato e comportamento

O cliente envia `campaign_id`, `state`, `player_input`, `action: null` e `available_actions`. Texto livre permanece texto livre: não há regex, heurística, LLM, rolagem ou cálculo mecânico no frontend. O `state` retornado pelo backend substitui o estado local da sessão, enquanto o histórico da tela é somente apresentação.

Quando o backend retorna `rule_resolution` com `status: "resolved"`, o cartão mostra os dados que vieram do Rule Engine. Para `needs_rule_validation`, nenhum cartão de dados falso é renderizado.

## Render Static Site

- **Repository:** `vanish994/dnd-byonder-frontend`
- **Build command:** `npm ci && npm run build`
- **Publish directory:** `dist`
- **Environment variable:** `VITE_GAME_API_URL=https://dnd-byonder-gateway.onrender.com`

O frontend não faz deploy automaticamente neste marco.
