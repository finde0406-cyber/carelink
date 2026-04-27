'use client'

import { useTranslations } from 'next-intl'

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
const SLOT_KEYS = ['morning', 'afternoon', 'evening'] as const
const SLOT_TIMES: Record<string, string> = {
  morning: '09:00–13:00',
  afternoon: '13:00–18:00',
  evening: '18:00–22:00',
}

export interface AvailItem {
  day_of_week: number
  time_slot: string
}

interface Props {
  availability: AvailItem[]
  editable?: boolean
  onChange?: (items: AvailItem[]) => void
}

export default function AvailabilityGrid({ availability, editable = false, onChange }: Props) {
  const t = useTranslations('availability')

  function isOn(day: number, slot: string) {
    return availability.some(a => a.day_of_week === day && a.time_slot === slot)
  }

  function toggle(day: number, slot: string) {
    if (!editable || !onChange) return
    if (isOn(day, slot)) {
      onChange(availability.filter(a => !(a.day_of_week === day && a.time_slot === slot)))
    } else {
      onChange([...availability, { day_of_week: day, time_slot: slot }])
    }
  }

  if (!editable && availability.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-3">{t('none')}</p>
    )
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[340px]">
        {/* Day header */}
        <div className="grid grid-cols-8 gap-1 mb-1.5">
          <div />
          {DAY_KEYS.map((day, i) => (
            <div key={day}
              className={`text-center text-xs font-bold py-1.5 rounded-lg
                ${i >= 5 ? 'text-rose-400' : 'text-gray-500'}`}>
              {t(`days.${day}`)}
            </div>
          ))}
        </div>

        {/* Slot rows */}
        {SLOT_KEYS.map(slot => (
          <div key={slot} className="grid grid-cols-8 gap-1 mb-1.5">
            {/* Label */}
            <div className="flex flex-col justify-center">
              <span className="text-xs font-semibold text-gray-700 leading-tight">
                {t(`slots.${slot}`)}
              </span>
              <span className="text-[10px] text-gray-400 leading-tight mt-0.5">
                {SLOT_TIMES[slot]}
              </span>
            </div>

            {/* Cells */}
            {DAY_KEYS.map((_, dayIdx) => {
              const on = isOn(dayIdx, slot)
              const isWeekend = dayIdx >= 5
              return (
                <button
                  key={dayIdx}
                  type="button"
                  disabled={!editable}
                  onClick={() => toggle(dayIdx, slot)}
                  className={`h-10 rounded-xl text-sm font-bold transition-all duration-150
                    ${on
                      ? isWeekend
                        ? 'bg-emerald-400 text-white shadow-sm'
                        : 'bg-emerald-500 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-300'
                    }
                    ${editable ? 'hover:opacity-75 cursor-pointer active:scale-95' : 'cursor-default'}
                  `}
                >
                  {on ? '✓' : ''}
                </button>
              )
            })}
          </div>
        ))}

        {/* Legend */}
        {editable && (
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 bg-emerald-500 rounded" />
              <span className="text-xs text-gray-500">가능</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 bg-gray-100 rounded" />
              <span className="text-xs text-gray-500">불가</span>
            </div>
            <span className="text-xs text-gray-400 ml-auto">클릭하여 토글</span>
          </div>
        )}
      </div>
    </div>
  )
}
