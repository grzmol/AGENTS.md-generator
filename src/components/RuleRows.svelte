<script lang="ts">
  import { groupLabel } from '../lib/labels'
  import { layoutRules } from '../lib/layout'
  import { workbench as wb } from '../lib/workbench.svelte'
  import type { Rule } from '../lib/types'

  let { rules }: { rules: Rule[] } = $props()

  const items = $derived(layoutRules(rules))
</script>

<ul class="group">
  {#each items as item (item.kind === 'rule' ? item.rule.id : `group-${item.id}`)}
    {#if item.kind === 'rule'}
      <li>
        <label class="row">
          <span class="row-body">
            <span class="row-title">{item.rule.title}{#if item.rule.recommended}<span class="badge-rec">Recommended</span>{/if}</span>
            <span class="row-text">{item.rule.text}</span>
          </span>
          <input class="switch" type="checkbox" role="switch" checked={wb.active.selected.has(item.rule.id)} onchange={() => wb.toggle(item.rule.id)} />
        </label>
      </li>
    {:else}
      {@const chosen = item.rules.find((rule) => wb.active.selected.has(rule.id))}
      <li class="row choice">
        <div class="choice-head">
          <span class="row-title">{groupLabel(item.id)}</span>
          <div class="segmented" role="radiogroup" aria-label={groupLabel(item.id)}>
            {#each item.rules as rule (rule.id)}
              <button type="button" role="radio" aria-checked={wb.active.selected.has(rule.id)} onclick={() => wb.toggle(rule.id)}>{rule.title}</button>
            {/each}
          </div>
        </div>
        <p class="row-text">{chosen ? chosen.text : 'Not selected, so this stays out of the file. Choose an option to include it.'}</p>
      </li>
    {/if}
  {/each}
</ul>
