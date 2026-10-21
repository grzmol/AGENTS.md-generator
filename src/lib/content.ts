import type { Pack, Preset } from './types'

const packModules = import.meta.glob<Pack>('../../content/packs/*.json', { eager: true, import: 'default' })
const presetModules = import.meta.glob<Preset>('../../content/presets/*.json', { eager: true, import: 'default' })

export const packs: Pack[] = Object.values(packModules).sort((a, b) => a.order - b.order)
export const presets: Preset[] = Object.values(presetModules).sort((a, b) => a.title.localeCompare(b.title))
