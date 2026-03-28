"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase";
import type { Post } from "@/types";
import type { Session } from "@supabase/supabase-js";
const aliasRule = z.string().max(30, 'Max 30 tecken')
  .refine(v => !v || v.trim().length >= 2, 'Minst 2 tecken')
  .refine(v => !v || !/^\s|\s$/.test(v), 'Inga mellanslag i början/slutet')
  .refine(v => !v || !/\s{2,}/.test(v), 'Max ett mellanslag i rad')
  .refine(v => !v || /^[a-zA-Z0-9åäöÅÄÖ_\-. ]*$/.test(v), 'Ogiltigt tecken')

const schema = z.object({
  tag: z.enum(["match", "transfer", "general", "tactic", "other"]),
  content: z.string().min(1).max(5000),
  link_url: z.string().url("Ogiltig URL").or(z.literal("")).optional(),
  alias: aliasRule.optional(),
});
type Form = z.infer<typeof schema>;
const TAGS = [
  {
    value: "general",
    label: "Allmänt",
  },
  {
    value: "match",
    label: "Match",
  },
  {
    value: "transfer",
    label: "Transfer",
  },
  {
    value: "tactic",
    label: "Taktik",
  },
  { value: "other", label: "Övrigt" },
];
interface Props {
  forumId: string;
  session: Session;
  userAlias: string | null;
  onClose: () => void;
  onCreated: (p: Post) => void;
  onTyping?: () => void;
  onBroadcast?: (id: string) => void;
}
export function NewPostModal({
  forumId,
  session,
  userAlias,
  onClose,
  onCreated,
  onTyping,
  onBroadcast,
}: Props) {
  const supabase = createClient();
  const [savedAlias, setSavedAlias] = useState(userAlias);
  const [showAlias, setShowAlias] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const username =
    session.user.user_metadata?.username ??
    session.user.email?.split("@")[0] ??
    "Du";
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { tag: "general", content: "", alias: userAlias ?? "" },
  });
  const [aliasError, setAliasError] = useState('')
  const saveAlias = async (alias: string) => {
    const t = alias.trim().replace(/\s{2,}/g, ' ')
    if (t.length > 0 && t.length < 2) { setAliasError('Minst 2 tecken'); return }
    if (t.length > 30) { setAliasError('Max 30 tecken'); return }
    if (!/^[a-zA-Z0-9åäöÅÄÖ_\-. ]*$/.test(t)) { setAliasError('Ogiltigt tecken'); return }
    setAliasError('')
    await supabase
      .from("user_aliases")
      .upsert(
        { user_id: session.user.id, forum_id: forumId, alias: t },
        { onConflict: "user_id,forum_id" },
      );
    setSavedAlias(t || null);
    setShowAlias(false);
  };
  const [submitError, setSubmitError] = useState("");
  const onSubmit = async (data: Form) => {
    setSubmitting(true);
    setSubmitError("");
    const { data: post, error } = await supabase
      .from("posts")
      .insert({
        forum_id: forumId,
        author_id: session.user.id,
        title: "",
        content: data.content,
        tag: data.tag,
        link_url: data.link_url || null,
      })
      .select(
        "*, author:profiles!author_id(id,username,default_alias,avatar_url,is_online,role)",
      )
      .single();
    if (error) {
      console.error("Post error:", error);
      setSubmitError("Kunde inte publicera: " + error.message);
      setSubmitting(false);
      return;
    }
    if (post) {
      onCreated({ ...(post as Post), alias: savedAlias });
      onBroadcast?.((post as Post).id);
    }
    setSubmitting(false);
  };
  return (
    <div
      className="fixed inset-0 bg-black/75 flex items-end sm:items-center justify-center z-50 pb-[54px] sm:pb-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-mp-s1 border border-mp-border border-b-0 sm:border-b rounded-t-2xl sm:rounded-2xl p-4 sm:p-5 w-full sm:max-w-lg max-h-[80vh] sm:max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar on mobile */}
        <div className="flex justify-center mb-3 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-mp-border" />
        </div>

        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg sm:text-2xl tracking-wide">NYTT INLÄGG</h2>
          <button onClick={onClose} className="text-mp-t2 hover:text-mp-t0">
            <X size={18} />
          </button>
        </div>

        {/* Author row — compact on mobile */}
        <div className="flex items-center gap-2 bg-mp-s2 border border-mp-border rounded-lg px-3 py-2 mb-3">
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold truncate">{savedAlias || username}</div>
            <div className="text-[10px] text-mp-t2 truncate">
              {savedAlias ? `Alias · ${username}` : "Ditt användarnamn"}
            </div>
          </div>
          <button
            onClick={() => setShowAlias((v) => !v)}
            className="text-[10px] text-mp-t2 hover:text-mp-t0 transition-colors flex-shrink-0"
          >
            Ändra alias
          </button>
        </div>

        {showAlias && (
          <div className="mb-3 animate-fade-in">
            <div className="flex gap-2">
              <input
                {...register("alias")}
                className="mp-input flex-1 text-sm"
                placeholder="Forumnamn..."
              />
              <button
                type="button"
                onClick={() => saveAlias(watch("alias") ?? "")}
                className="btn-primary text-xs py-1.5 px-3 flex-shrink-0"
              >
                Spara
              </button>
            </div>
            {aliasError && <p className="text-mp-red text-[10px] mt-1">{aliasError}</p>}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          {/* Tag + link on same row to save vertical space */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[9px] font-bold uppercase tracking-widest text-mp-t2 block mb-1">Ämne</label>
              <select {...register("tag")} className="mp-input text-sm py-1.5">
                {TAGS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-[9px] font-bold uppercase tracking-widest text-mp-t2 block mb-1">
                Länk <span className="font-normal">(valfritt)</span>
              </label>
              <input
                {...register("link_url")}
                className="mp-input text-sm py-1.5"
                placeholder="https://..."
              />
              {errors.link_url && (
                <p className="text-mp-red text-[10px] mt-0.5">{errors.link_url.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="text-[9px] font-bold uppercase tracking-widest text-mp-t2 block mb-1">Meddelande</label>
            <textarea
              {...register("content")}
              onKeyDown={() => onTyping?.()}
              className="mp-input resize-none min-h-[160px] sm:min-h-[120px] text-sm"
              placeholder="Dela dina tankar..."
            />
            {errors.content && (
              <p className="text-mp-red text-[10px] mt-0.5">{errors.content.message}</p>
            )}
          </div>

          {submitError && (
            <div className="bg-mp-red/10 border border-mp-red/30 rounded-lg px-3 py-2 text-xs text-mp-red">
              {submitError}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={submitting} className="btn-primary flex-1 text-sm py-2">
              {submitting ? "Publicerar..." : "Publicera"}
            </button>
            <button type="button" onClick={onClose} className="btn-ghost text-sm py-2 px-4">
              Avbryt
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
