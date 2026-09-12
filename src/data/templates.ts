import type { EstimateTemplate } from '../types'

/**
 * Готовые наборы работ под типовые объекты. Объёмы — усреднённые,
 * мастер правит их под замер. Цены подставляются из текущего каталога.
 */
export const PRESET_TEMPLATES: EstimateTemplate[] = [
  {
    id: 'preset-bathroom',
    name: 'Санузел 3 м² (пол + стены)',
    kind: 'bathroom',
    lines: [
      { refId: 'w-demo-wall', name: 'Демонтаж плитки со стен', unit: 'м²', price: 0, qty: 18, kind: 'work' },
      { refId: 'w-waterproof', name: 'Гидроизоляция обмазочная (2 слоя)', unit: 'м²', price: 0, qty: 8, kind: 'work' },
      { refId: 'w-primer', name: 'Грунтовка основания', unit: 'м²', price: 0, qty: 21, kind: 'work' },
      { refId: 'w-wall', name: 'Плитка на стену, прямая укладка', unit: 'м²', price: 0, qty: 18, kind: 'work' },
      { refId: 'w-floor', name: 'Плитка на пол, прямая укладка', unit: 'м²', price: 0, qty: 3, kind: 'work' },
      { refId: 'w-grout', name: 'Затирка швов цементная', unit: 'м²', price: 0, qty: 21, kind: 'work' },
      { refId: 'w-45', name: 'Запил кромки под 45° («ус»)', unit: 'п.м', price: 0, qty: 6, kind: 'work' },
      { refId: 'w-hole', name: 'Отверстие под трубу / розетку', unit: 'шт', price: 0, qty: 6, kind: 'work' },
      { refId: 'w-silicone', name: 'Силиконовый шов', unit: 'п.м', price: 0, qty: 8, kind: 'work' },
      { refId: 'w-hatch', name: 'Монтаж люка-невидимки', unit: 'шт', price: 0, qty: 1, kind: 'work' },
    ],
  },
  {
    id: 'preset-apron',
    name: 'Кухонный фартук 4 м²',
    kind: 'kitchen',
    lines: [
      { refId: 'w-primer', name: 'Грунтовка основания', unit: 'м²', price: 0, qty: 4, kind: 'work' },
      { refId: 'w-apron', name: 'Фартук на кухне', unit: 'м²', price: 0, qty: 4, kind: 'work' },
      { refId: 'w-grout', name: 'Затирка швов цементная', unit: 'м²', price: 0, qty: 4, kind: 'work' },
      { refId: 'w-cut', name: 'Прямая резка / подрезка плитки', unit: 'п.м', price: 0, qty: 8, kind: 'work' },
      { refId: 'w-hole', name: 'Отверстие под трубу / розетку', unit: 'шт', price: 0, qty: 4, kind: 'work' },
      { refId: 'w-profile', name: 'Раскладка / профиль на угол', unit: 'п.м', price: 0, qty: 5, kind: 'work' },
      { refId: 'w-silicone', name: 'Силиконовый шов', unit: 'п.м', price: 0, qty: 4, kind: 'work' },
    ],
  },
  {
    id: 'preset-balcony',
    name: 'Балкон / лоджия 5 м² (пол)',
    kind: 'balcony',
    lines: [
      { refId: 'w-demo-floor', name: 'Демонтаж плитки с пола (с клеем)', unit: 'м²', price: 0, qty: 5, kind: 'work' },
      { refId: 'w-screed', name: 'Стяжка пола / наливной пол', unit: 'м²', price: 0, qty: 5, kind: 'work' },
      { refId: 'w-primer', name: 'Грунтовка основания', unit: 'м²', price: 0, qty: 5, kind: 'work' },
      { refId: 'w-floor', name: 'Плитка на пол, прямая укладка', unit: 'м²', price: 0, qty: 5, kind: 'work' },
      { refId: 'w-grout', name: 'Затирка швов цементная', unit: 'м²', price: 0, qty: 5, kind: 'work' },
      { refId: 'w-plinth', name: 'Плинтус / бордюр керамический', unit: 'п.м', price: 0, qty: 9, kind: 'work' },
    ],
  },
  {
    id: 'preset-floor',
    name: 'Пол в комнате 20 м² (керамогранит)',
    kind: 'floor',
    lines: [
      { refId: 'w-demo-screed', name: 'Демонтаж старой стяжки', unit: 'м²', price: 0, qty: 20, kind: 'work' },
      { refId: 'w-screed', name: 'Стяжка пола / наливной пол', unit: 'м²', price: 0, qty: 20, kind: 'work' },
      { refId: 'w-primer', name: 'Грунтовка основания', unit: 'м²', price: 0, qty: 20, kind: 'work' },
      { refId: 'w-large', name: 'Керамогранит крупного формата (от 60×60)', unit: 'м²', price: 0, qty: 20, kind: 'work' },
      { refId: 'w-grout', name: 'Затирка швов цементная', unit: 'м²', price: 0, qty: 20, kind: 'work' },
      { refId: 'w-plinth', name: 'Плинтус / бордюр керамический', unit: 'п.м', price: 0, qty: 18, kind: 'work' },
      { refId: 'w-cleanup', name: 'Вынос мусора', unit: 'м²', price: 0, qty: 20, kind: 'work' },
    ],
  },
]
