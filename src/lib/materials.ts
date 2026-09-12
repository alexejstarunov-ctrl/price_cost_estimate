import type { MaterialInput } from '../types'

/** Запас на подрезку — зависит от раскладки */
const WASTE: Record<MaterialInput['layout'], number> = {
  straight: 0.07,
  brick: 0.1,
  diagonal: 0.15,
  herringbone: 0.2,
}

export const LAYOUT_LABELS: Record<MaterialInput['layout'], string> = {
  straight: 'Прямая (шов в шов)',
  brick: 'Вразбежку («кирпичик»)',
  diagonal: 'По диагонали',
  herringbone: '«Ёлочка»',
}

/**
 * Зуб гребёнки подбирается по длинной стороне плитки, а расход клея —
 * по зубу. Значения практические, из рекомендаций производителей смесей.
 */
function trowelForTile(maxSide: number): { teeth: number; kgPerM2: number } {
  if (maxSide <= 100) return { teeth: 4, kgPerM2: 2.2 }
  if (maxSide <= 200) return { teeth: 6, kgPerM2: 3.2 }
  if (maxSide <= 300) return { teeth: 8, kgPerM2: 4.2 }
  if (maxSide <= 600) return { teeth: 10, kgPerM2: 5.5 }
  return { teeth: 12, kgPerM2: 7.0 }
}

export type MaterialResult = {
  tileArea: number
  wastePercent: number
  trowelTeeth: number
  glueKg: number
  glueBags: number
  groutKg: number
  primerL: number
  crossPacks: number
  tileCost: number
}

const GLUE_BAG_KG = 25
const GROUT_DENSITY = 1.6

export function calcMaterials(input: MaterialInput): MaterialResult {
  const { area, tileWidth, tileHeight, tileThickness, jointWidth, layout, tilePrice } = input

  const wastePercent = WASTE[layout]
  const tileArea = area * (1 + wastePercent)

  const maxSide = Math.max(tileWidth, tileHeight)
  const trowel = trowelForTile(maxSide)
  const glueKg = area * trowel.kgPerM2
  const glueBags = Math.ceil(glueKg / GLUE_BAG_KG)

  // Каноническая формула производителей затирки: (A+B)/(A×B) × толщина × шов × плотность
  const groutPerM2 =
    tileWidth > 0 && tileHeight > 0
      ? ((tileWidth + tileHeight) / (tileWidth * tileHeight)) *
        tileThickness *
        jointWidth *
        GROUT_DENSITY
      : 0
  const groutKg = area * groutPerM2 * 1.15

  const primerL = area * 0.3
  const crossPacks = Math.ceil(area / 10)

  return {
    tileArea: round(tileArea, 2),
    wastePercent,
    trowelTeeth: trowel.teeth,
    glueKg: round(glueKg, 1),
    glueBags,
    groutKg: round(groutKg, 2),
    primerL: round(primerL, 1),
    crossPacks,
    tileCost: round(tileArea * tilePrice, 0),
  }
}

function round(value: number, digits: number): number {
  const k = 10 ** digits
  return Math.round(value * k) / k
}
