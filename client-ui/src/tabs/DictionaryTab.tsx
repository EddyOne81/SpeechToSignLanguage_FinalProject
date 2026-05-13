import { AlertCircle, Loader2, RefreshCw, Search } from "lucide-react";
import type { DictionaryItem, TabType } from "../types";

interface DictionaryTabProps {
  dictQuery: string;
  setDictQuery: (q: string) => void;
  dictItems: DictionaryItem[];
  dictPage: number;
  dictTotalPages: number;
  dictTotalElements: number;
  dictLoading: boolean;
  dictError: string | null;
  loadDictionary: (targetPage?: number, overrideQuery?: string) => Promise<void>;
  setInputText: (text: string) => void;
  setActiveTab: (tab: TabType) => void;
  startTextTranslation: (overrideText?: string) => Promise<void>;
}

export default function DictionaryTab({
  dictQuery,
  setDictQuery,
  dictItems,
  dictPage,
  dictTotalPages,
  dictTotalElements,
  dictLoading,
  dictError,
  loadDictionary,
  setInputText,
  setActiveTab,
  startTextTranslation,
}: DictionaryTabProps) {
  return (
    <div className="grid flex-1 grid-cols-1 gap-6 xl:grid-cols-12">
      <div className="flex flex-col gap-4 glass-panel rounded-2xl p-5 shadow-lg xl:col-span-4">
        <h3 className="text-sm font-semibold ">
          Dictionary Search
        </h3>
        <div className="flex flex-col gap-2">
          <label className="text-xs uppercase tracking-wide text-slate-500">
            Keyword
          </label>
          <input
            value={dictQuery}
            onChange={(event) => setDictQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void loadDictionary(0);
              }
            }}
            placeholder="Search gloss or phrase"
            className="ui-input w-full rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => void loadDictionary(0)}
            className="ui-btn-primary flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wide transition">
            <Search className="h-4 w-4" />
            Search
          </button>
          <button
            onClick={() => {
              setDictQuery("");
              void loadDictionary(0, "");
            }}
            className="ui-btn-secondary flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wide transition">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
        {dictError && (
          <div className="ui-alert-error flex items-center rounded-lg p-2 text-xs">
            <AlertCircle className="mr-2 h-4 w-4" />
            {dictError}
          </div>
        )}
        <div className="glass-inset rounded-xl p-4 text-xs text-slate-400">
          Use search to pull cached signs and gloss phrases from the
          dictionary. Click any result to reuse in translation.
        </div>
      </div>

      <div className="flex min-h-[320px] flex-col glass-panel rounded-2xl p-5 shadow-lg xl:col-span-8">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold ">
            Results
          </h3>
          <span className="text-xs text-slate-500">
            {dictTotalElements} items
          </span>
        </div>
        <div className="mt-4 flex-1 space-y-3 overflow-y-auto">
          {dictLoading ? (
            <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading dictionary...
            </div>
          ) : dictItems.length > 0 ? (
            dictItems.map((item) => (
              <div
                key={item.wordId}
                className="glass-inset rounded-xl p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-200">
                      {item.englishText}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {(item.entryType ?? "PHRASE").toString()}
                      {item.cacheSource ? ` - ${item.cacheSource}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setInputText(item.englishText);
                      setActiveTab("translate");
                      void startTextTranslation(item.englishText);
                    }}
                    className="rounded-full border border-violet-300/40 bg-violet-300/12 px-3 py-1 text-[11px] uppercase text-violet-100 transition hover:border-violet-300/80">
                    Use
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-400">
                  <span className="rounded-full border border-slate-800 bg-slate-900 px-2 py-0.5">
                    {item.spokenLang ?? "en"}
                    {" -> "}
                    {item.signedLang ?? "ase"}
                  </span>
                  {item.poseFilePath && (
                    <span className="rounded-full border border-violet-300/35 bg-violet-300/12 px-2 py-0.5 text-violet-100">
                      pose cached
                    </span>
                  )}
                  {item.normalizedText && (
                    <span className="rounded-full border border-slate-800 bg-slate-900 px-2 py-0.5">
                      normalized: {item.normalizedText}
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">
              No dictionary items found yet.
            </p>
          )}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-700/40 pt-3">
          <div className="text-xs text-slate-400">
            Page {dictTotalPages > 0 ? dictPage + 1 : 0} /{" "}
            {dictTotalPages || 0}
          </div>
          <div className="flex items-center gap-2">
            {dictTotalPages > 1 && dictPage > 0 && (
              <button
                onClick={() => void loadDictionary(0)}
                disabled={dictLoading}
                className="ui-btn-secondary rounded-md px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50">
                First
              </button>
            )}
            <button
              onClick={() => void loadDictionary(Math.max(0, dictPage - 1))}
              disabled={dictLoading || dictPage <= 0}
              className="ui-btn-secondary rounded-md px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50">
              Prev
            </button>
            <select
              value={dictTotalPages > 0 ? dictPage : 0}
              onChange={(event) => void loadDictionary(Number(event.target.value))}
              disabled={dictLoading || dictTotalPages <= 0}
              className="ui-input rounded-md px-2 py-1.5 text-xs">
              {Array.from({ length: dictTotalPages || 1 }, (_, idx) => (
                <option key={idx} value={idx}>
                  Page {idx + 1}
                </option>
              ))}
            </select>
            <button
              onClick={() =>
                void loadDictionary(
                  Math.min(
                    Math.max(dictTotalPages - 1, 0),
                    dictPage + 1,
                  ),
                )
              }
              disabled={
                dictLoading ||
                dictTotalPages <= 0 ||
                dictPage >= dictTotalPages - 1
              }
              className="ui-btn-secondary rounded-md px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50">
              Next
            </button>
            {dictTotalPages > 1 && dictPage < dictTotalPages - 1 && (
              <button
                onClick={() => void loadDictionary(Math.max(dictTotalPages - 1, 0))}
                disabled={dictLoading}
                className="ui-btn-secondary rounded-md px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50">
                Last
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
