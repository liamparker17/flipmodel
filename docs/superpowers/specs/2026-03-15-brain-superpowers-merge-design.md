# Brain → Superpowers Integration — Design Spec

## Problem

Two parallel systems fight for control. The Brain (Claude Corner) has valuable content — security checklists, critique loops, domain skills — but delivers it as markdown files that rely on Claude remembering to read them. Superpowers has real enforcement via the Skill tool but lacks the Brain's discipline (critique, session logging, security routing). The result: superpowers wins by having stronger language, and the Brain's best features (critique, verify, log, security) get skipped every time.

## Goal

Convert the Brain's unique content into proper superpowers skills that get real enforcement. One system, not two.

---

## Design

### New Superpowers Skills

#### 1. `superpowers:critique-loop`

**Trigger:** After completing any implementation chunk, before claiming work is done.

**Content:** The Brain's self-assessment protocol from `protocols/reasoning_graph.md`:

1. Does this fully address what the user asked? [YES / PARTIALLY / NO]
2. Are there edge cases I haven't handled? [NONE KNOWN / YES: list them]
3. Would this pass the security/permissions checklist? [YES / NO: which items fail]
4. Am I uncertain about any part of this? [NO / YES: what specifically]

**Routing:**
- All YES/NONE KNOWN → proceed
- Any PARTIALLY or YES (uncertainty) → fix before continuing
- Any NO → stop, fix, re-run critique

**Integration:** Referenced by `superpowers:subagent-driven-development` and `superpowers:verification-before-completion` as a required pre-step.

#### 2. `superpowers:security-review`

**Trigger:** When touching auth, permissions, user input, API endpoints, or any code that handles sensitive data.

**Content:** The Brain's `skills/operations/security.md`:
- Attack surface identification
- OWASP-based security checklist (input validation, auth, secrets, API, dependencies)
- Severity classification (Critical/High/Medium/Low)
- Rules: no logged secrets, least privilege, no custom crypto

#### 3. `superpowers:session-logging`

**Trigger:** At the end of every working session, before the conversation ends.

**Content:** The Brain's Section 6 — write a structured session log entry:
- Objective
- Changes made (file: what changed and why)
- Technical decisions
- Known issues
- Next steps

Saved to `docs/session_log.md` in the project. Also updates `docs/project_state.json` if it exists.

#### 4. `superpowers:gui-design`

**Trigger:** When building UI components, layouts, visual design, or responsive work.

**Content:** The Brain's `skills/product/gui_design.md`:
- Identify screen purpose and primary user action
- Check existing components before creating new
- Apply spacing grid and typography scale
- Follow layout rules and breakpoints
- Build components in isolation before composing
- Review at mobile, tablet, desktop breakpoints

#### 5. `superpowers:api-design`

**Trigger:** When creating or modifying API routes, REST endpoints, or request/response handling.

**Content:** The Brain's `skills/engineering/api_design.md`:
- RESTful conventions
- Error response format
- Pagination patterns
- Rate limiting
- Input validation at system boundaries
- API versioning decisions

#### 6. `superpowers:database-modeling`

**Trigger:** When designing database schemas, creating migrations, or modifying Prisma models.

**Content:** The Brain's `skills/engineering/database_modeling.md`:
- Schema design principles
- Migration safety
- Indexing strategy
- Query patterns
- Multi-tenancy considerations

### CLAUDE.md Updates

Replace the current Brain trigger in `~/.claude/CLAUDE.md`:

**Remove:**
```
When the user says "use your brain", "read the brain", or "brain mode":
1. Read Claude's Brain.md
2. Follow the startup protocol...
```

**Replace with:**
```
## Engineering Discipline

These rules apply to EVERY session automatically:

1. After completing any implementation work, invoke `superpowers:critique-loop` before claiming done
2. When touching auth, permissions, user input, or API endpoints, invoke `superpowers:security-review`
3. When building or modifying UI, invoke `superpowers:gui-design`
4. When creating or modifying API routes, invoke `superpowers:api-design`
5. When modifying database schema, invoke `superpowers:database-modeling`
6. At the end of substantial work sessions, invoke `superpowers:session-logging`
```

### What Gets Retired

- `Claude's Brain.md` — no longer the entry point. Its classification table content moves to CLAUDE.md as a lightweight reference.
- Brain skills that already have superpowers equivalents are no longer loaded:
  - `[[debugging]]` → `superpowers:systematic-debugging`
  - `[[review]]` → `superpowers:requesting-code-review`
  - `[[planning]]` → `superpowers:writing-plans`
  - `[[coding]]` + `[[testing]]` → `superpowers:test-driven-development`
- The Brain files stay in Claude Corner for reference but are not actively loaded.

### Skill File Locations

Personal superpowers skills live in `~/.claude/skills/`:

```
~/.claude/skills/
  critique-loop/SKILL.md
  security-review/SKILL.md
  session-logging/SKILL.md
  gui-design/SKILL.md
  api-design/SKILL.md
  database-modeling/SKILL.md
```

### File Summary

| File | Action |
|------|--------|
| `~/.claude/skills/critique-loop/SKILL.md` | Create |
| `~/.claude/skills/security-review/SKILL.md` | Create |
| `~/.claude/skills/session-logging/SKILL.md` | Create |
| `~/.claude/skills/gui-design/SKILL.md` | Create |
| `~/.claude/skills/api-design/SKILL.md` | Create |
| `~/.claude/skills/database-modeling/SKILL.md` | Create |
| `~/.claude/CLAUDE.md` | Update — replace Brain trigger with always-on discipline rules |
