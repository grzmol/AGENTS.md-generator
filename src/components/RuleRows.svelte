<script lang="ts">
  import { groupLabel } from '../lib/labels'
  import { layoutRules } from '../lib/layout'
  import { workbench as wb } from '../lib/workbench.svelte'
  import type { Rule } from '../lib/types'

  let { rules }: { rules: Rule[] } = $props()

  const items = $derived(layoutRules(rules))
</script>

<ul class="rows">
  {#each items as item (item.kind === 'rule' ? item.rule.id : `group-${item.id}`)}
    {#if item.kind === 'rule'}
      <li>
        <label class="row">
          <input type="checkbox" checked={wb.active.selected.has(item.rule.id)} onchange={() => wb.toggle(item.rule.id)} />
          <span class="row-body">
            <span class="row-title">{item.rule.title}{#if item.rule.recommended}<span class="rec" title="Recommended" role="img" aria-label="Recommended"></span>{/if}</span>
            <span class="row-text">{item.rule.text}</span>
          </span>
        </label>
      </li>
    {:else}
      {@const chosen = item.rules.find((rule) => wb.active.selected.has(rule.id))}
      <li class="choice">
        <div role="radiogroup" aria-label={groupLabel(item.id)}>
        <span class="choice-label">{groupLabel(item.id)}<span class="choice-hint">choose one</span></span>
        <div class="seg">
          {#each item.rules as rule (rule.id)}
            <button type="button" role="radio" aria-checked={wb.active.selected.has(rule.id)} onclick={() => wb.toggle(rule.id)}>
              {rule.title}{#if rule.recommended}<span class="rec" title="Recommended" role="img" aria-label="Recommended"></span>{/if}
            </button>
          {/each}
        </div>
        </div>
        <p class="choice-text">{chosen ? chosen.text : 'Nothing selected, so this stays out of the file.'}</p>
      </li>
    {/if}
  {/each}
</ul>
