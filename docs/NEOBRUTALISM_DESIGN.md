# Free Agent Swarm — Neo-Brutalism visual direction (2026-10-30)

## Decision

Adopt the owner's selected Neo-Brutalism direction, based on the reference **Neo-Brutalism UI Kit** by Muhamad Digdaya: https://www.figma.com/community/file/1209478811951634271. This is **stylistic reference only**: no images, proprietary Figma file, fonts, screenshots, components, or layouts were copied from that kit. Usage terms for the original kit have not been verified for redistribution.

An independent reference is the MIT-licensed open-source React component project https://github.com/neobrutalism/neobrutalism. This implementation retains the project's existing no-dependency HTML/CSS/JavaScript architecture, so it does **not** vendor any third-party component code. The palette, illustrations, SVG and arrangement in this revision are original to the project.

## Product-specific visual rules

- **A relay, not a dashboard:** the main attraction is the visible quota handoff from one agent to another. The launch ticket and inspector remain adjacent to that flow.
- **Contrast:** heavy nearly-black outlines, flat yellow/coral/lime/purple/blue fills, offset hard shadows, recognizable agent portraits, halftone texture and handoff arrows.
- **Accessibility:** navigable buttons, visible focus outlines, meaningful accessible names for agent buttons, responsive desktop/mobile layouts, reduced-motion support, and honest simulation labeling.
- **No fake production claims:** runs and quotas are educational simulation data, never live provider telemetry. Real OpenRouter/Groq planning remains in separately imported n8n workflows.
- **Lightweight:** self-contained CSS and inline SVG; no required remote images, fonts, analytics, UI framework or package download.

## Source comparisons and trade-offs

- n8n / Langflow: visible workflow concepts are relevant, but a full drag-and-drop workflow editor would misrepresent the current deterministic, read-only demo. The relay can become an editor only when backend actions and state are supported.
- Linear: clear status/navigation hierarchy, but generic enterprise UI cards are not an appropriate visual identity here.
- Neo-Brutalism UI Kit (Muhamad Digdaya): visual language chosen by the owner; **no claim of license to copy downloadable Figma assets**.

## Validation boundaries

`npm test` and `npm run build` validate the simulation and package. Browser smoke tests must verify the four views, mobile overflow, input presets, agent inspection, completion, checkpoint import/export and keyboard behavior. Live API calls, actual git changes, paid models, and cross-device persistence are out of scope.
