import type { CommentDoc } from "@/lib/types";
import { ROLE_LABELS } from "@/lib/constants";

export function Guestbook({ comments }: { comments: CommentDoc[] }) {
  return (
    <div className="space-y-4">
      {comments.map((c) => (
        <article
          key={c.comment_id}
          className="rounded-xl border border-dashed border-[color:var(--border)] bg-white/60 p-4"
        >
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-semibold">{c.author_name}</p>
            <p className="text-xs text-[color:var(--ink-muted)]">
              {ROLE_LABELS[c.author_role as keyof typeof ROLE_LABELS] ??
                c.author_role}{" "}
              · {new Date(c.created_at).toLocaleString("zh-TW")}
            </p>
          </div>
          <p className="leading-relaxed">{c.content}</p>
          {c.reply_photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={c.reply_photo_url}
              alt="改善後照片"
              className="mt-3 max-h-48 rounded-lg object-cover"
            />
          ) : null}
        </article>
      ))}
      {comments.length === 0 ? (
        <p className="text-sm text-[color:var(--ink-muted)]">
          尚無留言。扣分後衛生股長可於此上傳改善照片銷案（第 2／4 週啟用）。
        </p>
      ) : null}
      <div className="rounded-xl border border-[color:var(--border)]/50 bg-[color:var(--accent-soft)]/30 p-4 text-sm text-[color:var(--ink-muted)]">
        留言表單殼層：第 2 週接上傳改善照片與狀態更新。
      </div>
    </div>
  );
}
