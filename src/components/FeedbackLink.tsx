import { ArrowUpRight, MessageSquare } from 'lucide-react';

export const FEEDBACK_URL = 'https://github.com/untiLJing-git/realplan/issues/new/choose';

export function FeedbackLink({ compact = false }: { compact?: boolean }) {
  return <a className={'feedback-link' + (compact ? ' feedback-link-compact' : '')} href={FEEDBACK_URL} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" aria-label="反馈与建议（在 GitHub 新标签页打开）" title="在 GitHub 提交问题或建议，请勿公开私人信息">
    {!compact && <MessageSquare size={17} aria-hidden="true" />}<span>反馈与建议</span><ArrowUpRight className="feedback-external" size={13} aria-hidden="true" />
  </a>;
}
