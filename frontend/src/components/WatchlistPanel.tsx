import { useEffect, useMemo, useState } from "react";

import type { TokenRecord, WatchlistEntry } from "../types";

interface WatchlistPanelProps {
  entries: WatchlistEntry[];
  onRemove: (entry: WatchlistEntry) => void;
  onSave: (entry: WatchlistEntry, note: string, tags: string[]) => void;
  onSelect: (token: TokenRecord) => void;
  savingId: string | null;
  selectedTokenKey: string | null;
}

export function WatchlistPanel({
  entries,
  onRemove,
  onSave,
  onSelect,
  savingId,
  selectedTokenKey
}: WatchlistPanelProps) {
  const selectedEntry = useMemo(
    () =>
      entries.find(
        (entry) => entry.token && `${entry.chainId}:${entry.tokenAddress}` === selectedTokenKey
      ) ?? entries[0] ?? null,
    [entries, selectedTokenKey]
  );
  const [note, setNote] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  useEffect(() => {
    setNote(selectedEntry?.note ?? "");
    setTagsInput(selectedEntry?.tags.join(", ") ?? "");
  }, [selectedEntry]);

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Manual watchlist</p>
          <h2>Favorites and notes</h2>
        </div>
        <span className="muted-copy">{entries.length} saved</span>
      </div>

      {entries.length === 0 ? (
        <div className="empty-state">
          <p>Your watchlist is empty.</p>
          <span className="muted-copy">
            Save interesting tokens from the table to curate a smaller review queue.
          </span>
        </div>
      ) : (
        <>
          <div className="watchlist-list">
            {entries.map((entry) => {
              const token = entry.token;
              const tokenKey = `${entry.chainId}:${entry.tokenAddress}`;

              return (
                <button
                  className={`watchlist-item ${selectedTokenKey === tokenKey ? "watchlist-item--selected" : ""}`}
                  key={entry._id}
                  onClick={() => {
                    if (token) {
                      onSelect(token);
                    }
                  }}
                  type="button"
                >
                  <div>
                    <strong>{token ? `${token.symbol} • ${token.name}` : entry.tokenAddress}</strong>
                    <div className="muted-copy">{entry.note || "No note yet"}</div>
                  </div>
                  <span className="pill">{entry.chainId}</span>
                </button>
              );
            })}
          </div>

          {selectedEntry ? (
            <form
              className="watchlist-editor"
              onSubmit={(event) => {
                event.preventDefault();
                onSave(
                  selectedEntry,
                  note,
                  tagsInput
                    .split(",")
                    .map((tag) => tag.trim())
                    .filter(Boolean)
                );
              }}
            >
              <label className="field">
                <span className="field-label">Research note</span>
                <textarea
                  className="field-input field-textarea"
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="What makes this token worth keeping on the list?"
                  rows={4}
                  value={note}
                />
              </label>

              <label className="field">
                <span className="field-label">Tags</span>
                <input
                  className="field-input"
                  onChange={(event) => setTagsInput(event.target.value)}
                  placeholder="memecoin, breakout, low float"
                  value={tagsInput}
                />
              </label>

              <div className="watchlist-editor__actions">
                <button
                  className="ghost-button"
                  disabled={savingId === selectedEntry._id}
                  type="submit"
                >
                  {savingId === selectedEntry._id ? "Saving..." : "Save note"}
                </button>
                <button
                  className="ghost-button ghost-button--danger"
                  disabled={savingId === selectedEntry._id}
                  onClick={() => onRemove(selectedEntry)}
                  type="button"
                >
                  Remove from watchlist
                </button>
              </div>
            </form>
          ) : null}
        </>
      )}
    </section>
  );
}
