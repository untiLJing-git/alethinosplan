import { weekdayLabels } from '../lib/i18n';
import { useLocale } from '../hooks/LocaleProvider';
import { CalendarDays, Check, Clock3, MousePointer2, Plus, StickyNote, Sun } from 'lucide-react';
import { PREVIEW_PANELS, useProductPreview } from '../hooks/useProductPreview';
import type { PreviewPanel } from '../hooks/useProductPreview';
import { monthDates, monthLabel, todayDate } from '../lib/dates';

interface Props { interruption: number; enabled: boolean }

export function ProductPreview({ interruption, enabled }: Props) {
  const { t, locale } = useLocale();
  const preview = useProductPreview(interruption, enabled);
  const tearing = preview.todayStage === 'tear' || preview.todayStage === 'done';
  const position = (panel: PreviewPanel) => ['front', 'middle', 'back'][(PREVIEW_PANELS.indexOf(panel) - PREVIEW_PANELS.indexOf(preview.panel) + PREVIEW_PANELS.length) % PREVIEW_PANELS.length];
  const today = todayDate();
  const dates = monthDates(today);

  return <figure className="product-preview" data-stage={preview.stage} data-active-panel={preview.panel} data-today-stage={preview.todayStage} data-playing={preview.playing} aria-label={t("产品界面预览")}>
    <div className="preview-stage" role="img" aria-label={t("我的一天、规划日历和随手记轮换展示。当前界面位于最前方，画面使用固定内容，不创建任务。")}>
      <div className="preview-scenery" aria-hidden="true">
        <section className="preview-panel" data-panel="today" data-position={position('today')}>
          <div className="preview-panel-heading"><Sun size={14} />{t("我的一天")}</div>
          <div className="preview-window-lines"><span /><span /><span /></div>
          <div className={`preview-note sticky-note tone-lemon ${tearing ? 'is-tearing' : ''}`}>
            <span className="paper-tape" />
            <div className="paper-stub"><Check size={15} /></div>
            <div className="paper-sheet" onAnimationEnd={event => {
              if (event.target === event.currentTarget && event.animationName === 'tear-away') preview.finishTear();
            }}>
              <div className="sticky-top"><span className="sticky-kicker">{t("今天")}</span><span className="preview-check"><Check size={15} /></span></div>
              <span className="sticky-title">{t("读一章喜欢的书")}</span>
              <div className="sticky-bottom"><span className="sticky-estimate"><Clock3 size={12} />{t('{count} 分钟', { count: 20 })}</span></div>
            </div>
          </div>
          <MousePointer2 className="preview-cursor" size={23} fill="currentColor" strokeWidth={1.4} />
          <div className="preview-result"><span className="preview-result-icon"><Check size={18} /></span><div><strong>{t("读一章喜欢的书")}</strong><small>{t("已完成")}</small></div></div>
        </section>
        <section className="preview-panel" data-panel="calendar" data-position={position('calendar')}>
          <div className="preview-panel-heading"><CalendarDays size={14} />{t("规划日历")}<small>{monthLabel(today, locale)}</small></div>
          <div className="preview-calendar-week">{weekdayLabels(locale).map(day => <span key={day}>{day}</span>)}</div>
          <div className="preview-calendar-grid">{dates.map((date, index) => <div key={date} className={`preview-date ${date === today ? 'is-selected' : ''} ${date.slice(0, 7) !== today.slice(0, 7) ? 'is-outside' : ''}`}><span>{Number(date.slice(-2))}</span>{date === today ? <i className="preview-calendar-event">{t("阅读")}</i> : [9, 17, 24].includes(index) ? <i className="preview-calendar-placeholder" /> : null}</div>)}</div>
        </section>
        <section className="preview-panel" data-panel="notes" data-position={position('notes')}>
          <div className="preview-panel-heading"><StickyNote size={14} />{t("随手记")}<Plus className="preview-heading-action" size={15} /></div>
          <div className="preview-notes-list">{[t('找时间给朋友写封信'), t('了解一门新的设计课程'), t('读一章喜欢的书')].map((title, index) => <div className={`preview-note-row ${index === 2 ? 'preview-note-new' : ''}`} key={title}><span><StickyNote size={14} /></span><div>{title}</div><CalendarDays size={12} /></div>)}</div>
        </section>
      </div>
    </div>
  </figure>;
}
