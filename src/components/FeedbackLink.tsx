import { useLocale } from '../hooks/LocaleProvider';
import { ArrowUpRight, MessageSquare } from 'lucide-react';

export const FEEDBACK_URL = 'https://github.com/untiLJing-git/alethinosplan/issues/new/choose';

export function FeedbackLink({ compact = false }: { compact?: boolean }) {
  const { t } = useLocale();
  return <a className={'feedback-link' + (compact ? ' feedback-link-compact' : '')} href={FEEDBACK_URL} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" aria-label={t("反馈与建议（在 GitHub 新标签页打开）")} title={t("在 GitHub 提交问题或建议，请勿公开私人信息")}>
    {!compact && <MessageSquare size={17} aria-hidden="true" />}<span>{t("反馈与建议")}</span><ArrowUpRight className="feedback-external" size={13} aria-hidden="true" />
  </a>;
}
