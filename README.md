# AI Code Governance Action

> Governança de código diretamente no Pull Request.

GitHub Action para detectar riscos de segurança e governança em código antes do merge.

## v0.1.0

Primeira versão funcional.

### Implementado

- ✅ Secret scanning
- ✅ AWS access keys
- ✅ GitHub tokens
- ✅ OpenAI API keys
- ✅ Private keys
- ✅ Generic API keys, passwords, secrets and tokens
- ✅ Execução local no GitHub Actions runner
- ✅ Bloqueio automático do workflow
- ✅ Não exibe o segredo detectado nos logs

### Roadmap

- [x] v0.1 — Secret scanning
- [ ] v0.2 — Brazilian PII detection via pii-br
- [ ] v0.3 — AI code provenance
- [ ] v0.4 — Repository governance policies

## Uso

```yaml
name: AI Code Governance

on:
  pull_request:

jobs:
  governance:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: misspaiva/ai-code-governance-action@v0.1.0
        with:
          fail-on-secret: "true"