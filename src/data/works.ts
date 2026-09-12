import type { WorkItem } from '../types'

/**
 * Базовые расценки — Москва и МО, ₽ за единицу, срез сентября 2026.
 * Для других регионов применяется коэффициент из REGION_FACTOR.
 * range — наблюдаемый разброс по рынку РФ, показывается подсказкой в каталоге.
 *
 * Это средние рыночные ориентиры, а не нормативные расценки ГЭСН/ФЕР.
 */
export const CATEGORIES = [
  'Подготовка основания',
  'Укладка плитки',
  'Дополнительные работы',
  'Комплексные работы',
  'Материалы',
] as const

export const BASE_WORKS: WorkItem[] = [
  // ---------- Подготовка основания ----------
  { id: 'w-demo-wall', name: 'Демонтаж плитки со стен', unit: 'м²', category: 'Подготовка основания', price: 350, range: [120, 400], source: 'base' },
  { id: 'w-demo-floor', name: 'Демонтаж плитки с пола (с клеем)', unit: 'м²', category: 'Подготовка основания', price: 400, range: [150, 450], source: 'base' },
  { id: 'w-demo-screed', name: 'Демонтаж старой стяжки', unit: 'м²', category: 'Подготовка основания', price: 500, range: [300, 650], source: 'base' },
  { id: 'w-primer', name: 'Грунтовка основания', unit: 'м²', category: 'Подготовка основания', price: 130, range: [60, 150], source: 'base' },
  { id: 'w-level-wall', name: 'Выравнивание стен под плитку', unit: 'м²', category: 'Подготовка основания', price: 850, range: [500, 900], source: 'base' },
  { id: 'w-screed', name: 'Стяжка пола / наливной пол', unit: 'м²', category: 'Подготовка основания', price: 750, range: [400, 800], source: 'base' },
  { id: 'w-waterproof', name: 'Гидроизоляция обмазочная (2 слоя)', unit: 'м²', category: 'Подготовка основания', price: 450, range: [250, 500], source: 'base' },
  { id: 'w-gkl', name: 'Обшивка стен ГКЛ под плитку', unit: 'м²', category: 'Подготовка основания', price: 900, range: [700, 1300], source: 'base' },

  // ---------- Укладка плитки ----------
  { id: 'w-wall', name: 'Плитка на стену, прямая укладка', unit: 'м²', category: 'Укладка плитки', price: 1750, range: [700, 1750], source: 'base' },
  { id: 'w-floor', name: 'Плитка на пол, прямая укладка', unit: 'м²', category: 'Укладка плитки', price: 1400, range: [720, 1400], source: 'base' },
  { id: 'w-large', name: 'Керамогранит крупного формата (от 60×60)', unit: 'м²', category: 'Укладка плитки', price: 1900, range: [1100, 2000], source: 'base' },
  { id: 'w-slab', name: 'Керамогранит большого формата (до 160×320)', unit: 'м²', category: 'Укладка плитки', price: 2000, range: [1550, 2000], source: 'base' },
  { id: 'w-diagonal', name: 'Укладка по диагонали', unit: 'м²', category: 'Укладка плитки', price: 1700, range: [990, 1700], source: 'base', note: 'Обычно +15–25% к прямой укладке' },
  { id: 'w-brick', name: 'Укладка вразбежку («кабанчик»)', unit: 'м²', category: 'Укладка плитки', price: 1600, range: [850, 1600], source: 'base' },
  { id: 'w-herringbone', name: 'Укладка «ёлочкой»', unit: 'м²', category: 'Укладка плитки', price: 2000, range: [1350, 2400], source: 'base' },
  { id: 'w-mosaic-net', name: 'Мозаика на сетке', unit: 'м²', category: 'Укладка плитки', price: 2500, range: [1500, 2800], source: 'base' },
  { id: 'w-mosaic-piece', name: 'Мозаика штучная / с рисунком', unit: 'м²', category: 'Укладка плитки', price: 3000, range: [2000, 3000], source: 'base' },
  { id: 'w-apron', name: 'Фартук на кухне', unit: 'м²', category: 'Укладка плитки', price: 2000, range: [1100, 2200], source: 'base' },
  { id: 'w-stone', name: 'Декоративный / искусственный камень', unit: 'м²', category: 'Укладка плитки', price: 1800, range: [950, 1800], source: 'base' },
  { id: 'w-warmfloor', name: 'Укладка плитки на тёплый пол', unit: 'м²', category: 'Укладка плитки', price: 1600, range: [1200, 2200], source: 'base' },
  { id: 'w-stairs', name: 'Ступени с подступенками', unit: 'п.м', category: 'Укладка плитки', price: 1500, range: [630, 1550], source: 'base' },
  { id: 'w-facade', name: 'Облицовка фасада / цоколя', unit: 'м²', category: 'Укладка плитки', price: 2100, range: [1600, 3000], source: 'base' },

  // ---------- Дополнительные работы ----------
  { id: 'w-grout', name: 'Затирка швов цементная', unit: 'м²', category: 'Дополнительные работы', price: 250, range: [150, 250], source: 'base' },
  { id: 'w-grout-epoxy', name: 'Затирка швов эпоксидная', unit: 'м²', category: 'Дополнительные работы', price: 700, range: [600, 700], source: 'base' },
  { id: 'w-45', name: 'Запил кромки под 45° («ус»)', unit: 'п.м', category: 'Дополнительные работы', price: 650, range: [200, 700], source: 'base' },
  { id: 'w-cut', name: 'Прямая резка / подрезка плитки', unit: 'п.м', category: 'Дополнительные работы', price: 300, range: [120, 350], source: 'base' },
  { id: 'w-slopes', name: 'Откосы, короба', unit: 'п.м', category: 'Дополнительные работы', price: 1000, range: [580, 1000], source: 'base' },
  { id: 'w-plinth', name: 'Плинтус / бордюр керамический', unit: 'п.м', category: 'Дополнительные работы', price: 380, range: [140, 400], source: 'base' },
  { id: 'w-profile', name: 'Раскладка / профиль на угол', unit: 'п.м', category: 'Дополнительные работы', price: 280, range: [200, 450], source: 'base' },
  { id: 'w-hole', name: 'Отверстие под трубу / розетку', unit: 'шт', category: 'Дополнительные работы', price: 200, range: [110, 200], source: 'base' },
  { id: 'w-silicone', name: 'Силиконовый шов', unit: 'п.м', category: 'Дополнительные работы', price: 150, range: [100, 150], source: 'base' },
  { id: 'w-tray', name: 'Облицовка поддона душевой', unit: 'шт', category: 'Дополнительные работы', price: 1650, range: [1200, 2200], source: 'base' },
  { id: 'w-drain', name: 'Установка трапа с уклоном', unit: 'шт', category: 'Дополнительные работы', price: 1500, range: [1000, 2500], source: 'base' },
  { id: 'w-hatch', name: 'Монтаж люка-невидимки', unit: 'шт', category: 'Дополнительные работы', price: 3500, range: [2500, 5000], source: 'base' },
  { id: 'w-niche', name: 'Облицовка ниши', unit: 'шт', category: 'Дополнительные работы', price: 2500, range: [1800, 4000], source: 'base' },
  { id: 'w-cleanup', name: 'Вынос мусора', unit: 'м²', category: 'Дополнительные работы', price: 150, range: [100, 300], source: 'base' },

  // ---------- Комплексные работы ----------
  { id: 'w-bath-turnkey', name: 'Санузел «под ключ» (плитка)', unit: 'м²', category: 'Комплексные работы', price: 3000, range: [2500, 3000], source: 'base', note: 'Работы целиком: подготовка, укладка, затирка' },

  // ---------- Материалы ----------
  { id: 'm-tile', name: 'Плитка / керамогранит', unit: 'м²', category: 'Материалы', price: 1200, range: [600, 4000], source: 'base', note: 'Цена сильно зависит от коллекции' },
  { id: 'm-glue', name: 'Клей плиточный (мешок 25 кг)', unit: 'меш', category: 'Материалы', price: 600, range: [400, 900], source: 'base' },
  { id: 'm-glue-strong', name: 'Клей усиленный для крупного формата (25 кг)', unit: 'меш', category: 'Материалы', price: 900, range: [700, 1400], source: 'base' },
  { id: 'm-grout', name: 'Затирка цементная', unit: 'кг', category: 'Материалы', price: 350, range: [200, 600], source: 'base' },
  { id: 'm-grout-epoxy', name: 'Затирка эпоксидная', unit: 'кг', category: 'Материалы', price: 1800, range: [1200, 3000], source: 'base' },
  { id: 'm-primer', name: 'Грунтовка глубокого проникновения', unit: 'л', category: 'Материалы', price: 250, range: [150, 450], source: 'base' },
  { id: 'm-waterproof', name: 'Гидроизоляция обмазочная', unit: 'кг', category: 'Материалы', price: 400, range: [250, 700], source: 'base' },
  { id: 'm-svp', name: 'Система выравнивания плитки (комплект)', unit: 'компл', category: 'Материалы', price: 500, range: [300, 900], source: 'base' },
  { id: 'm-profile', name: 'Профиль / уголок алюминиевый', unit: 'п.м', category: 'Материалы', price: 350, range: [200, 700], source: 'base' },
  { id: 'm-silicone', name: 'Герметик санитарный', unit: 'шт', category: 'Материалы', price: 450, range: [300, 800], source: 'base' },
]
